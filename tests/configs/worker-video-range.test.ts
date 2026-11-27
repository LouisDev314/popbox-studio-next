import { statSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { serveKujiVideo } from '../../worker-video-range.mjs';

const videoUrl = 'https://www.popboxstudio.com/kuji-reveal.mp4';

function mockAsset() {
  return {
    fetch: vi.fn(async (request: Request) => new Response(
      request.method === 'HEAD' ? null : new ReadableStream({
        start(controller) {
          for (const chunk of ['0123', '456', '789']) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      }),
      {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': '10',
          ETag: '"video"',
        },
      },
    )),
  };
}

describe('Kuji video byte-range delivery', () => {
  it.each([
    ['bytes=2-6', 'bytes 2-6/10', '23456'],
    ['bytes=7-', 'bytes 7-9/10', '789'],
    ['bytes=-3', 'bytes 7-9/10', '789'],
    ['bytes=8-20', 'bytes 8-9/10', '89'],
  ])('streams only %s with byte range metadata', async (range, contentRange, body) => {
    const assets = mockAsset();
    const response = await serveKujiVideo(new Request(videoUrl, {
      headers: { Range: range, 'If-Range': '"video"' },
    }), assets);
    expect(response?.status).toBe(206);
    expect(response?.headers.get('Content-Range')).toBe(contentRange);
    expect(response?.headers.get('Content-Length')).toBe(String(body.length));
    expect(response?.headers.get('Accept-Ranges')).toBe('bytes');
    expect(response?.headers.get('Content-Type')).toBe('video/mp4');
    expect(response?.headers.get('ETag')).toBe('"video"');
    expect(await response?.text()).toBe(body);
    expect(assets.fetch.mock.calls[0][0].headers.has('Range')).toBe(false);
  });

  it.each(['bytes=10-', 'bytes=5-2', 'bytes=-0'])('returns 416 for %s', async (range) => {
    const response = await serveKujiVideo(new Request(videoUrl, { headers: { Range: range } }), mockAsset());
    expect(response?.status).toBe(416);
    expect(response?.headers.get('Content-Range')).toBe('bytes */10');
    expect(await response?.text()).toBe('');
  });

  it('uses the bundled video length when the binding omits Content-Length', async () => {
    const size = statSync('public/kuji-reveal.mp4').size;
    const assets = { fetch: vi.fn(async () => new Response('0', { headers: { 'Content-Type': 'video/mp4' } })) };
    const response = await serveKujiVideo(new Request(videoUrl, { headers: { Range: 'bytes=0-0' } }), assets);
    expect(response?.status).toBe(206);
    expect(response?.headers.get('Content-Range')).toBe(`bytes 0-0/${size}`);
    expect(await response?.text()).toBe('0');
    const head = await serveKujiVideo(new Request(videoUrl, { method: 'HEAD' }), assets);
    expect(head?.headers.get('Content-Length')).toBe(String(size));
    expect(head?.headers.get('Accept-Ranges')).toBe('bytes');
    expect(await head?.text()).toBe('');
  });

  it('keeps HEAD, full GET, and a stale If-Range on the full asset', async () => {
    const assets = mockAsset();
    const head = await serveKujiVideo(new Request(videoUrl, { method: 'HEAD' }), assets);
    expect(head?.status).toBe(200);
    expect(head?.headers.get('Content-Length')).toBe('10');
    expect(await head?.text()).toBe('');
    const full = await serveKujiVideo(new Request(videoUrl), assets);
    expect(full?.status).toBe(200);
    expect(await full?.text()).toBe('0123456789');
    const stale = await serveKujiVideo(new Request(videoUrl, {
      headers: { Range: 'bytes=1-3', 'If-Range': '"old"' },
    }), assets);
    expect(stale?.status).toBe(200);
    expect(await stale?.text()).toBe('0123456789');
  });
});
