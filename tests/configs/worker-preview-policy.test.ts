import { describe, expect, it, vi } from 'vitest';
import { fetchWithImageFallback, handleWorkerRequest } from '../../worker-preview-policy.mjs';

const previewOrigin = 'https://migration-popbox.example.workers.dev';
const productionOrigin = 'https://www.popboxstudio.com';

describe('Cloudflare Worker request handling', () => {
  it('blocks preview mutations and private GET routes before OpenNext', async () => {
    const worker = { fetch: vi.fn() };
    const post = await handleWorkerRequest(worker, new Request(`${previewOrigin}/api/v1/products`, {
      method: 'POST',
      body: '{}',
    }), {}, {});
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET, HEAD');
    expect(post.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(post.headers.get('Cache-Control')).toBe('private, no-store');

    for (const path of [
      '/account', '/admin', '/checkout/success', '/auth/callback',
      '/orders/demo/access', '/api/v1/checkout/success', '/api/v1/admin/orders',
      '/api/v1/orders/demo/access', '/api/v1/account/orders',
      '/api/v1/products/%252e%252e%252fadmin',
    ]) {
      const response = await handleWorkerRequest(worker, new Request(`${previewOrigin}${path}`), {}, {});
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('forwards anonymous catalog reads and adds noindex without combining cookies or consuming streams', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('catalog'));
        controller.close();
      },
    });
    const upstream = new Response(body, {
      headers: [
        ['Cache-Control', 'public, max-age=300'],
        ['Set-Cookie', 'first=1; Path=/'],
        ['Set-Cookie', 'second=2; Path=/'],
      ],
    });
    const worker = { fetch: vi.fn(async (_request: Request) => upstream) };
    const request = new Request('http://localhost:8787/api/v1/search/autocomplete?q=kuji', {
      headers: { Cookie: 'session=test', Authorization: 'Bearer test', 'X-HTTP-Method-Override': 'POST' },
    });
    const response = await handleWorkerRequest(worker, request, { POPBOX_PREVIEW_READ_ONLY: 'true' }, {});
    const [forwarded] = worker.fetch.mock.calls[0];
    expect(forwarded.url).toBe(request.url);
    expect(forwarded.headers.has('Cookie')).toBe(false);
    expect(forwarded.headers.has('Authorization')).toBe(false);
    expect(forwarded.headers.has('X-HTTP-Method-Override')).toBe(false);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.getSetCookie()).toEqual(['first=1; Path=/', 'second=2; Path=/']);
    expect(await response.text()).toBe('catalog');
  });

  it('leaves public production responses and their CDN directives unchanged', async () => {
    const request = new Request(`${productionOrigin}/api/v1/products`, {
      headers: { Cookie: '_ga=anonymous-analytics' },
    });
    const upstream = new Response(null, {
      headers: { 'Cache-Control': 'public, max-age=300', 'CDN-Cache-Control': 'max-age=600' },
    });
    const worker = { fetch: vi.fn(async () => upstream) };
    const env = {};
    const ctx = {};
    expect(await handleWorkerRequest(worker, request, env, ctx)).toBe(upstream);
    expect(worker.fetch).toHaveBeenCalledExactlyOnceWith(request, env, ctx);
  });

  it.each([previewOrigin, productionOrigin])('strips internal ISR headers on public ingress at %s', async (origin) => {
    const worker = { fetch: vi.fn(async (_request: Request) => new Response(null)) };
    const request = new Request(origin, {
      method: 'HEAD',
      headers: {
        'X-ISR': '1',
        'X-Prerender-Revalidate': 'fixture',
        'X-Prerender-Revalidate-If-Generated': '1',
        'If-None-Match': '"fixture"',
      },
    });

    await handleWorkerRequest(worker, request, {}, {});

    const [forwarded] = worker.fetch.mock.calls[0];
    expect(forwarded.method).toBe('HEAD');
    expect(forwarded.headers.has('X-ISR')).toBe(false);
    expect(forwarded.headers.has('X-Prerender-Revalidate')).toBe(false);
    expect(forwarded.headers.has('X-Prerender-Revalidate-If-Generated')).toBe(false);
    expect(forwarded.headers.get('If-None-Match')).toBe('"fixture"');
  });

  it.each([
    '/account', '/auth/callback', '/admin/products', '/%61dmin/products', '/orders/test/tickets',
    '/cart', '/checkout/success', '/api/v1/admin/products', '/api/v1/account/profile', '/api/v1/orders/test',
  ])('forbids shared caching for %s', async (path) => {
    const upstream = new Response('private result', {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000',
        'CDN-Cache-Control': 'max-age=600',
        'Cloudflare-CDN-Cache-Control': 'max-age=600',
        'Vercel-CDN-Cache-Control': 'max-age=600',
        'Surrogate-Control': 'max-age=600',
        Vary: 'RSC, Next-Router-State-Tree',
      },
    });
    const request = new Request(`${productionOrigin}${path}`);
    const worker = { fetch: vi.fn(async () => upstream) };
    const result = await handleWorkerRequest(worker, request, {}, {});
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    for (const name of ['CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control', 'Vercel-CDN-Cache-Control', 'Surrogate-Control']) {
      expect(result.headers.has(name)).toBe(false);
    }
    expect(result.headers.get('Vary')).toBe('RSC, Next-Router-State-Tree');
    expect(result.headers.has('X-Robots-Tag')).toBe(false);
    expect(await result.text()).toBe('private result');
  });

  it('marks authenticated and mutating API responses private', async () => {
    const worker = { fetch: vi.fn(async () => new Response(null, { status: 204 })) };
    const requestOptions: RequestInit[] = [
      { headers: { Authorization: 'Bearer fixture' } },
      { headers: { Cookie: '_ga=anonymous-analytics; sb-example-auth-token.0=session' } },
      { method: 'POST', body: '{}' },
    ];
    for (const init of requestOptions) {
      const request = new Request(`${productionOrigin}/api/v1/products`, init);
      const result = await handleWorkerRequest(worker, request, {}, {});
      expect(result.status).toBe(204);
      expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    }
  });

  it('preserves public-site session refresh cookies while prohibiting shared caching', async () => {
    const upstream = new Response(null, {
      status: 307,
      headers: [
        ['Location', '/products'],
        ['Set-Cookie', 'first=1; Expires=Sat, 01 Jan 2028 00:00:00 GMT; Path=/'],
        ['Set-Cookie', 'second=2; Path=/'],
        ['Cloudflare-CDN-Cache-Control', 'max-age=600'],
      ],
    });
    const worker = { fetch: vi.fn(async () => upstream) };
    const result = await handleWorkerRequest(worker, new Request(productionOrigin), {}, {});
    expect(result.status).toBe(307);
    expect(result.headers.get('Location')).toBe('/products');
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(result.headers.has('Cloudflare-CDN-Cache-Control')).toBe(false);
    expect(result.headers.getSetCookie()).toEqual(upstream.headers.getSetCookie());
  });

  it('retries only an image GET rejected by the Images Free quota', async () => {
    const quotaError = Object.assign(new Error('Images transformation quota'), { code: 9422 });
    const upstream = new Response('original image');
    const worker = { fetch: vi.fn().mockRejectedValueOnce(quotaError).mockResolvedValueOnce(upstream) };
    const env = { IMAGES: {}, ASSETS: {} };
    const ctx = {};
    const request = new Request('https://www.popboxstudio.com/_next/image?url=%2Ficon.png&w=96&q=75');
    expect(await fetchWithImageFallback(worker, request, env, ctx)).toBe(upstream);
    expect(worker.fetch).toHaveBeenNthCalledWith(1, request, env, ctx);
    expect(worker.fetch).toHaveBeenNthCalledWith(2, request, { ...env, IMAGES: undefined }, ctx);

    worker.fetch.mockReset().mockRejectedValue(quotaError);
    await expect(fetchWithImageFallback(worker, new Request('https://www.popboxstudio.com/products'), env, ctx))
      .rejects.toBe(quotaError);
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });
});
