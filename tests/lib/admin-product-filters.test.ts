import { describe, expect, it } from 'vitest';
import {
  buildAdminProductListQueryParams,
  buildAdminProductListKeyParams,
  buildAdminProductsRequestParams,
  parseAdminProductSortParam,
  parseAdminProductTypeParam,
  parseAdminTagIdParam,
} from '@/lib/admin-product-filters';
import { adminProductKeys } from '@/lib/admin-query-keys';

describe('admin product filters', () => {
  it('parses supported canonical product params', () => {
    expect(parseAdminProductTypeParam('kuji')).toBe('kuji');
    expect(parseAdminProductTypeParam('all')).toBeUndefined();
    expect(parseAdminProductSortParam('inventory_asc')).toBe('inventory_asc');
    expect(parseAdminProductSortParam('name_desc')).toBe('name_desc');
    expect(parseAdminProductSortParam('default')).toBeUndefined();
    expect(parseAdminTagIdParam(' tag-1 ')).toBe('tag-1');
  });

  it('normalizes admin product list params with backend defaults', () => {
    expect(buildAdminProductListQueryParams({
      search: '  hero  ',
    })).toEqual({
      collectionId: 'all',
      cursor: undefined,
      excludeCollectionId: undefined,
      limit: 25,
      productType: 'all',
      search: 'hero',
      sort: 'updated_desc',
      status: 'all',
      tagId: 'all',
    });
  });

  it('builds canonical query keys and request params', () => {
    const filters = buildAdminProductListQueryParams({
      collectionId: 'collection-1',
      cursor: 'cursor-1',
      productType: 'kuji',
      search: 'hero',
      sort: 'price_desc',
      status: 'active',
      tagId: 'tag-1',
    });

    expect(adminProductKeys.list(buildAdminProductListKeyParams(filters))).toEqual([
      'admin',
      'products',
      'list',
      {
        collectionId: 'collection-1',
        excludeCollectionId: undefined,
        limit: 25,
        productType: 'kuji',
        search: 'hero',
        sort: 'price_desc',
        status: 'active',
        tagId: 'tag-1',
      },
    ]);
    expect(buildAdminProductsRequestParams(filters)).toEqual({
      collectionId: 'collection-1',
      cursor: 'cursor-1',
      limit: 25,
      productType: 'kuji',
      search: 'hero',
      sort: 'price_desc',
      status: 'active',
      tagId: 'tag-1',
    });
  });

  it('uses the same normalized query scope across cursor pages', () => {
    const firstPageFilters = buildAdminProductListQueryParams({ search: '  hero  ' });
    const nextPageFilters = buildAdminProductListQueryParams({
      ...firstPageFilters,
      cursor: 'cursor-2',
    });
    const firstPageKey = adminProductKeys.list(buildAdminProductListKeyParams(firstPageFilters));
    const nextPageKey = adminProductKeys.list(buildAdminProductListKeyParams(nextPageFilters));
    const differentSearchKey = adminProductKeys.list(buildAdminProductListKeyParams(
      buildAdminProductListQueryParams({ search: 'villain' }),
    ));

    expect(nextPageKey).toEqual(firstPageKey);
    expect(differentSearchKey).not.toEqual(firstPageKey);
  });
});
