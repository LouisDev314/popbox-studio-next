import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPut: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet,
    put: mocks.axiosPut,
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

describe('Featured order route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies authenticated GET requests to the backend', async () => {
    mocks.axiosGet.mockResolvedValue({ status: 200, data: { success: true, data: { items: [] } } });
    const { GET } = await import('@/app/api/v1/admin/collections/featured/order/route');
    const response = await GET(new NextRequest('http://frontend.test/api/v1/admin/collections/featured/order', {
      headers: { Authorization: 'Bearer admin-token' },
    }));

    expect(mocks.axiosGet).toHaveBeenCalledWith(
      'http://backend.example.com/api/v1/admin/collections/featured/order',
      {
        headers: { Authorization: 'Bearer admin-token' },
        timeout: 15_000,
      },
    );
    expect(response.status).toBe(200);
  });

  it('revalidates storefront paths only after a successful PUT', async () => {
    const body = { productIds: ['00000000-0000-4000-8000-000000000001'] };
    mocks.axiosPut.mockResolvedValue({ status: 200, data: { success: true, data: { items: [] } } });
    const { PUT } = await import('@/app/api/v1/admin/collections/featured/order/route');
    const response = await PUT(new NextRequest('http://frontend.test/api/v1/admin/collections/featured/order', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }));

    expect(mocks.axiosPut).toHaveBeenCalledWith(
      'http://backend.example.com/api/v1/admin/collections/featured/order',
      body,
      {
        headers: { Authorization: 'Bearer admin-token' },
        timeout: 15_000,
      },
    );
    expect(mocks.revalidatePath.mock.calls).toEqual([['/'], ['/collections/featured']]);
    expect(response.status).toBe(200);
  });

  it('preserves an upstream membership conflict and does not revalidate', async () => {
    const upstreamBody = {
      code: 409,
      success: false,
      message: 'Featured membership changed',
      errors: { code: 'FEATURED_MEMBERSHIP_CHANGED' },
    };
    mocks.axiosPut.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: upstreamBody },
    });
    const { PUT } = await import('@/app/api/v1/admin/collections/featured/order/route');
    const response = await PUT(new NextRequest('http://frontend.test/api/v1/admin/collections/featured/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [] }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(upstreamBody);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
