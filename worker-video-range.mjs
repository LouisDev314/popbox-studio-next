// The Assets binding can omit Content-Length even when the edge returns it.
// The range tests verify this fallback against the deployed source file.
const kujiVideoSize = 8_909_718;

function streamByteRange(body, start, end) {
  const reader = body.getReader();
  let offset = 0;
  const sliced = new ReadableStream({
    async pull(controller) {
      while (offset <= end) {
        const { done, value } = await reader.read();
        if (done) {
          controller.error(new Error('The video ended before the requested byte range.'));
          return;
        }

        const previousOffset = offset;
        offset += value.byteLength;
        if (offset <= start) {
          continue;
        }

        controller.enqueue(value.subarray(Math.max(0, start - previousOffset), end - previousOffset + 1));
        if (offset > end) {
          controller.close();
          await reader.cancel();
        }
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  // Workers may only emit Content-Length for streams with a known byte count.
  if (typeof FixedLengthStream !== 'undefined') {
    const fixedLength = new FixedLengthStream(end - start + 1);
    // The returned stream already propagates read/write failures to the client.
    void sliced.pipeTo(fixedLength.writable).catch(() => {});
    return fixedLength.readable;
  }
  return sliced;
}

function matchesIfRange(validator, headers) {
  if (!validator) {
    return true;
  }
  if (validator.startsWith('"')) {
    return validator === headers.get('ETag');
  }
  return Number.isFinite(Date.parse(validator)) && validator === headers.get('Last-Modified');
}

async function serveVideoRange(request, assets, [, first, last]) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('Range');
  requestHeaders.delete('If-Range');
  const full = await assets.fetch(new Request(request, { headers: requestHeaders }));
  const contentLength = full.headers.get('Content-Length');
  const size = contentLength === null ? kujiVideoSize : Number(contentLength);
  if (
    full.status !== 200 || !full.body || !Number.isSafeInteger(size)
    || full.headers.has('Content-Encoding') || !matchesIfRange(request.headers.get('If-Range'), full.headers)
  ) {
    return full;
  }

  const start = first === '' ? Math.max(0, size - Number(last)) : Number(first);
  const end = first === '' || last === '' ? size - 1 : Math.min(size - 1, Number(last));
  const headers = new Headers(full.headers);
  headers.set('Accept-Ranges', 'bytes');

  if (start >= size || start > end) {
    await full.body.cancel();
    headers.delete('Content-Length');
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Cache-Control', 'no-store');
    return new Response(null, { status: 416, headers });
  }

  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(streamByteRange(full.body, start, end), { status: 206, headers });
}

async function serveVideoHead(request, assets) {
  const asset = await assets.fetch(request);
  if (asset.status !== 200) {
    return asset;
  }

  const head = new Response(null, asset);
  head.headers.set('Accept-Ranges', 'bytes');
  if (!head.headers.has('Content-Length') && !head.headers.has('Content-Encoding')) {
    head.headers.set('Content-Length', String(kujiVideoSize));
  }
  return head;
}

export function serveKujiVideo(request, assets) {
  if (
    !assets || (request.method !== 'GET' && request.method !== 'HEAD')
    || new URL(request.url).pathname !== '/kuji-reveal.mp4'
  ) {
    return undefined;
  }

  if (request.method === 'HEAD') {
    return serveVideoHead(request, assets);
  }

  const range = /^bytes=(\d*)-(\d*)$/i.exec(request.headers.get('Range')?.trim() ?? '');
  return range && (range[1] || range[2])
    ? serveVideoRange(request, assets, range)
    : assets.fetch(request);
}
