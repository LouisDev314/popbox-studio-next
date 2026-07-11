import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, HEAD } from '@/app/media/product-images/[...storageKey]/route';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    isAxiosError: (error: unknown) => Boolean(error && typeof error === 'object' && 'isAxiosError' in error),
    request: mocks.request,
  },
}));

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    siteUrl: 'https://www.popboxstudio.com',
    supabaseStorageBucket: 'product-images',
    supabaseUrl: 'https://project-ref.supabase.co',
  }),
}));

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VALID_STORAGE_KEY = ['products', PRODUCT_ID, 'main.webp'];

function createContext(storageKey = VALID_STORAGE_KEY) {
  return {
    params: Promise.resolve({ storageKey }),
  };
}

function createUpstreamResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: new Uint8Array([1, 2, 3]).buffer,
    headers: {
      'cache-control': 'public, max-age=3600',
      'content-length': '3',
      'content-type': 'image/webp',
      etag: '"image-etag"',
      'last-modified': 'Sat, 11 Jul 2026 20:00:00 GMT',
      'set-cookie': 'secret=should-not-forward',
      'x-robots-tag': 'none',
    },
    status: 200,
    ...overrides,
  };
}

describe('product image proxy route', () => {
  beforeEach(() => {
    mocks.request.mockReset();
  });

  it('serves valid product images inline without restrictive robot or sensitive headers', async () => {
    mocks.request.mockResolvedValue(createUpstreamResponse());

    const response = await GET(
      new Request(`https://www.popboxstudio.com/media/product-images/${VALID_STORAGE_KEY.join('/')}`),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('content-disposition')).toBe('inline');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(response.headers.get('x-robots-tag')).toBe('all');
    expect(response.headers.has('set-cookie')).toBe(false);
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      maxBodyLength: 5 * 1024 * 1024,
      maxContentLength: 5 * 1024 * 1024,
      maxRedirects: 0,
      method: 'GET',
      timeout: 5000,
      url: `https://project-ref.supabase.co/storage/v1/object/public/product-images/products/${PRODUCT_ID}/main.webp`,
    }));
  });

  it('supports HEAD without returning a body', async () => {
    mocks.request.mockResolvedValue(createUpstreamResponse({ data: new ArrayBuffer(0) }));

    const response = await HEAD(
      new Request(`https://www.popboxstudio.com/media/product-images/${VALID_STORAGE_KEY.join('/')}`, { method: 'HEAD' }),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('3');
    expect(await response.text()).toBe('');
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'HEAD' }));
  });

  it.each([
    ['path traversal', ['products', PRODUCT_ID, '..', 'secret.webp']],
    ['encoded path traversal', ['products', PRODUCT_ID, '%2e%2e', 'secret.webp']],
    ['an arbitrary upstream URL', ['https:', 'evil.example', 'image.webp']],
    ['a non-product path', ['avatars', PRODUCT_ID, 'image.webp']],
  ])('rejects %s', async (_label, storageKey) => {
    const response = await GET(
      new Request('https://www.popboxstudio.com/media/product-images/rejected'),
      createContext(storageKey),
    );

    expect(response.status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('rejects unsupported upstream MIME types', async () => {
    mocks.request.mockResolvedValue(createUpstreamResponse({
      headers: {
        'content-length': '3',
        'content-type': 'text/html',
      },
    }));

    const response = await GET(
      new Request('https://www.popboxstudio.com/media/product-images/unsupported'),
      createContext(),
    );

    expect(response.status).toBe(415);
  });

  it('preserves an upstream 404 without returning a placeholder', async () => {
    mocks.request.mockResolvedValue(createUpstreamResponse({ status: 404 }));

    const response = await GET(
      new Request('https://www.popboxstudio.com/media/product-images/missing'),
      createContext(),
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });
});
