import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      excludeCollectionId: 'collection-2',
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
        excludeCollectionId: 'collection-2',
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

  it('preserves the admin product list totalCount response field', async () => {
    const backendResponse = {
      data: {
        data: {
          items: [],
          nextCursor: 'cursor-2',
          totalCount: 26,
        },
      },
    };
    httpGet.mockResolvedValueOnce(backendResponse);
    const QueryConfigs = (await import('@/configs/api/query-config')).default;

    const response = await QueryConfigs.fetchAdminProducts();

    expect(response).toBe(backendResponse);
    expect(response.data.data).toEqual({
      items: [],
      nextCursor: 'cursor-2',
      totalCount: 26,
    });
  });

  it('loads the dedicated unpaginated Featured order endpoint with admin auth', async () => {
    const QueryConfigs = (await import('@/configs/api/query-config')).default;

    await QueryConfigs.fetchAdminFeaturedOrder();

    expect(httpGet).toHaveBeenCalledWith('/api/v1/admin/collections/featured/order', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });
});
