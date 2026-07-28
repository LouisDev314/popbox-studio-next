import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpDelete = vi.hoisted(() => vi.fn());
const httpPatch = vi.hoisted(() => vi.fn());
const httpPost = vi.hoisted(() => vi.fn());

vi.mock('@/api/http-client', () => ({
  default: {
    delete: httpDelete,
    patch: httpPatch,
    post: httpPost,
  },
}));

vi.mock('@/lib/api/admin-client', () => ({
  withAdminAuth: () => Promise.resolve({
    headers: { Authorization: 'Bearer test-token' },
  }),
}));

describe('product variant mutation config', () => {
  beforeEach(() => {
    httpDelete.mockReset();
    httpPatch.mockReset();
    httpPost.mockReset();
  });

  it('uses the dedicated create, metadata, inventory, and delete endpoints', async () => {
    const MutationConfigs = (await import('@/configs/api/mutation-config')).default;
    const auth = { headers: { Authorization: 'Bearer test-token' } };
    const productId = 'product-1';
    const variantId = 'variant-1';

    await MutationConfigs.createAdminProductVariant({
      productId,
      data: { name: 'Blue', priceCents: 2499 },
    });
    await MutationConfigs.updateAdminProductVariant({
      productId,
      variantId,
      data: { isDefault: true },
    });
    await MutationConfigs.updateAdminProductVariantInventory({
      productId,
      variantId,
      data: { onHand: 4 },
    });
    await MutationConfigs.deleteAdminProductVariant({ productId, variantId });

    expect(httpPost).toHaveBeenCalledWith(
      '/api/v1/admin/products/product-1/variants',
      { name: 'Blue', priceCents: 2499 },
      auth,
    );
    expect(httpPatch).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/products/product-1/variants/variant-1',
      { isDefault: true },
      auth,
    );
    expect(httpPatch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/products/product-1/variants/variant-1/inventory',
      { onHand: 4 },
      auth,
    );
    expect(httpDelete).toHaveBeenCalledWith(
      '/api/v1/admin/products/product-1/variants/variant-1',
      auth,
    );
  });
});
