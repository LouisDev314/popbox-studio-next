import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProductsQueryParams } from '@/configs/api/query-config';

const httpGet = vi.hoisted(() => vi.fn());

vi.mock('@/api/http-client', () => ({
  default: {
    get: httpGet,
  },
}));

vi.mock('@/lib/api/admin-client', () => ({
  withAdminAuth: (config = {}) => Promise.resolve({
    ...config,
    headers: {
      Authorization: 'Bearer test-token',
    },
  }),
}));

describe('buildProductsQueryParams', () => {
  it('omits an empty cursor param', () => {
    expect(buildProductsQueryParams({
      collection: 'featured',
      pageParam: undefined,
      sort: 'newest',
    })).toEqual({
      collection: 'featured',
      sort: 'newest',
    });
  });

  it('omits undefined sort values for default storefront ordering', () => {
    expect(buildProductsQueryParams({
      collection: 'featured',
      sort: undefined,
    })).toEqual({
      collection: 'featured',
    });
  });
});

describe('admin query configs', () => {
  beforeEach(() => {
    httpGet.mockReset();
    httpGet.mockResolvedValue({ data: { data: { items: [], nextCursor: null } } });
  });

  it('sends backend-supported admin order params', async () => {
    const QueryConfigs = (await import('@/configs/api/query-config')).default;

    await QueryConfigs.fetchAdminOrders({
      cursor: 'cursor-1',
      limit: 25,
      search: 'PBX-1001',
      sort: 'total_desc',
      status: 'paid',
    });

    expect(httpGet).toHaveBeenCalledWith('/api/v1/admin/orders', {
      headers: {
        Authorization: 'Bearer test-token',
      },
      params: {
        cursor: 'cursor-1',
        limit: 25,
        search: 'PBX-1001',
        sort: 'total_desc',
        status: 'paid',
      },
    });
  });

  it('sends canonical backend-supported admin product params', async () => {
    const QueryConfigs = (await import('@/configs/api/query-config')).default;

    await QueryConfigs.fetchAdminProducts({
      collectionId: 'collection-1',
      cursor: 'cursor-2',
      limit: 25,
      productType: 'kuji',
      search: 'hero',
      sort: 'price_asc',
      status: 'active',
      tagId: 'tag-1',
    });

    expect(httpGet).toHaveBeenCalledWith('/api/v1/admin/products', {
      headers: {
        Authorization: 'Bearer test-token',
      },
      params: {
        collectionId: 'collection-1',
        cursor: 'cursor-2',
        limit: 25,
        productType: 'kuji',
        search: 'hero',
        sort: 'price_asc',
        status: 'active',
        tagId: 'tag-1',
      },
    });
    expect(httpGet.mock.calls[0][1].params).not.toHaveProperty('type');
    expect(httpGet.mock.calls[0][1].params).not.toHaveProperty('tagIds');
  });
});
