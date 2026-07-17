import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpPut = vi.hoisted(() => vi.fn());

vi.mock('@/api/http-client', () => ({
  default: {
    put: httpPut,
  },
}));

vi.mock('@/lib/api/admin-client', () => ({
  withAdminAuth: () => Promise.resolve({
    headers: { Authorization: 'Bearer test-token' },
  }),
}));

describe('Featured order mutation config', () => {
  beforeEach(() => {
    httpPut.mockReset();
    httpPut.mockResolvedValue({ data: { data: { items: [] } } });
  });

  it('sends the visual product order to the focused endpoint', async () => {
    const MutationConfigs = (await import('@/configs/api/mutation-config')).default;
    const payload = { productIds: ['product-3', 'product-1', 'product-2'] };

    await MutationConfigs.updateAdminFeaturedOrder(payload);

    expect(httpPut).toHaveBeenCalledWith(
      '/api/v1/admin/collections/featured/order',
      payload,
      { headers: { Authorization: 'Bearer test-token' } },
    );
  });
});
