import axios from 'axios';
import {
  buildSupabaseProductImageUrl,
  validateProductImageStorageKey,
} from '@/lib/seo-product-images';

const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_REQUEST_TIMEOUT_MS = 5000;

type ProductImageRouteContext = {
  params: Promise<{
    storageKey: string[];
  }>;
};

function readSafeHeader(value: unknown): string | null {
  return typeof value === 'string' && !/[\r\n]/.test(value) ? value : null;
}

function buildResponseHeaders(
  upstreamHeaders: Record<string, unknown>,
  contentType: string,
  contentLength: number,
): Headers {
  const headers = new Headers({
    'Cache-Control': readSafeHeader(upstreamHeaders['cache-control']) ?? 'public, max-age=3600',
    'Content-Disposition': 'inline',
    'Content-Length': String(contentLength),
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'all',
  });
  const etag = readSafeHeader(upstreamHeaders.etag);
  const lastModified = readSafeHeader(upstreamHeaders['last-modified']);

  if (etag) {
    headers.set('ETag', etag);
  }

  if (lastModified) {
    headers.set('Last-Modified', lastModified);
  }

  return headers;
}

async function proxyProductImage(
  method: 'GET' | 'HEAD',
  context: ProductImageRouteContext,
): Promise<Response> {
  const { storageKey: storageKeySegments } = await context.params;
  const storageKey = validateProductImageStorageKey(storageKeySegments.join('/'));

  if (!storageKey) {
    return new Response(null, { status: 400 });
  }

  const upstreamUrl = buildSupabaseProductImageUrl(storageKey);

  if (!upstreamUrl) {
    return new Response(null, { status: 500 });
  }

  try {
    const upstreamResponse = await axios.request<ArrayBuffer>({
      method,
      url: upstreamUrl,
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg',
      },
      maxBodyLength: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
      maxContentLength: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
      maxRedirects: 0,
      responseType: 'arraybuffer',
      timeout: PRODUCT_IMAGE_REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });

    if (upstreamResponse.status !== 200) {
      return new Response(null, { status: upstreamResponse.status });
    }

    const contentType = readSafeHeader(upstreamResponse.headers['content-type'])
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase() ?? '';

    if (!PRODUCT_IMAGE_ALLOWED_MIME_TYPES.has(contentType)) {
      return new Response(null, { status: 415 });
    }

    const declaredContentLength = Number(upstreamResponse.headers['content-length']);
    const body = method === 'GET' ? new Uint8Array(upstreamResponse.data) : null;
    const contentLength = body?.byteLength ?? declaredContentLength;

    if (
      !Number.isSafeInteger(contentLength)
      || contentLength <= 0
      || contentLength > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES
    ) {
      return new Response(null, { status: 502 });
    }

    return new Response(body, {
      headers: buildResponseHeaders(upstreamResponse.headers, contentType, contentLength),
      status: 200,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return new Response(null, { status: 504 });
    }

    return new Response(null, { status: 502 });
  }
}

export async function GET(_request: Request, context: ProductImageRouteContext): Promise<Response> {
  return proxyProductImage('GET', context);
}

export async function HEAD(_request: Request, context: ProductImageRouteContext): Promise<Response> {
  return proxyProductImage('HEAD', context);
}
