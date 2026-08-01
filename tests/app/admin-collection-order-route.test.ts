import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosPatch: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    patch: mocks.axiosPatch,
    isAxiosError: (error: unknown) => Boolean(
      error && typeof error === 'object' && 'isAxiosError' in error,
    ),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/configs/public-env', () => ({
  resolveApiBaseUrl: () => 'http://backend.example.com',
}));

describe('Collection order route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies the authenticated PATCH and revalidates the storefront layout', async () => {
    const body = { collectionIds: ['00000000-0000-4000-8000-000000000001'] };
    mocks.axiosPatch.mockResolvedValue({ status: 200, data: { success: true, data: [] } });
    const { PATCH } = await import('@/app/api/v1/admin/collections/reorder/route');
    const response = await PATCH(new NextRequest('http://frontend.test/api/v1/admin/collections/reorder', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }));

    expect(mocks.axiosPatch).toHaveBeenCalledWith(
      'http://backend.example.com/api/v1/admin/collections/reorder',
      body,
      {
        headers: { Authorization: 'Bearer admin-token' },
        timeout: 15_000,
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(response.status).toBe(200);
  });

  it('preserves an upstream membership conflict without revalidating', async () => {
    const upstreamBody = {
      code: 409,
      success: false,
      message: 'Collection membership changed',
      errors: { code: 'COLLECTION_MEMBERSHIP_CHANGED' },
    };
    mocks.axiosPatch.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: upstreamBody },
    });
    const { PATCH } = await import('@/app/api/v1/admin/collections/reorder/route');
    const response = await PATCH(new NextRequest('http://frontend.test/api/v1/admin/collections/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionIds: [] }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(upstreamBody);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
