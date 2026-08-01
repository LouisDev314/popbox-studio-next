import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpPatch = vi.hoisted(() => vi.fn());

vi.mock('@/api/http-client', () => ({
  default: {
    patch: httpPatch,
  },
}));

vi.mock('@/lib/api/admin-client', () => ({
  withAdminAuth: () => Promise.resolve({
    headers: { Authorization: 'Bearer test-token' },
  }),
}));

describe('Collection order mutation config', () => {
  beforeEach(() => {
    httpPatch.mockReset();
    httpPatch.mockResolvedValue({ data: { data: [] } });
  });

  it('sends every collection ID in visual order', async () => {
    const MutationConfigs = (await import('@/configs/api/mutation-config')).default;
    const payload = {
      collectionIds: ['collection-3', 'collection-1', 'collection-2'],
    };

    await MutationConfigs.reorderAdminCollections(payload);

    expect(httpPatch).toHaveBeenCalledWith(
      '/api/v1/admin/collections/reorder',
      payload,
      { headers: { Authorization: 'Bearer test-token' } },
    );
  });
});
