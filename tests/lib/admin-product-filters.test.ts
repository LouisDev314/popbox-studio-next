import { describe, expect, it } from 'vitest';
import {
  buildAdminProductListQueryParams,
  buildAdminProductsQueryKey,
  buildAdminProductsQueryScopeKey,
  buildAdminProductsRequestParams,
  isSameAdminProductsQueryScope,
  parseAdminProductSortParam,
  parseAdminProductTypeParam,
  parseAdminTagIdParam,
} from '@/lib/admin-product-filters';

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

    expect(buildAdminProductsQueryKey(filters)).toEqual([
      'admin',
      'products',
      'hero',
      'active',
      'kuji',
      'collection-1',
      '',
      'tag-1',
      'price_desc',
      'cursor-1',
      25,
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
    const scopeKey = buildAdminProductsQueryScopeKey(firstPageFilters);

    expect(isSameAdminProductsQueryScope(buildAdminProductsQueryKey(firstPageFilters), scopeKey)).toBe(true);
    expect(isSameAdminProductsQueryScope(buildAdminProductsQueryKey(nextPageFilters), scopeKey)).toBe(true);
    expect(isSameAdminProductsQueryScope(
      buildAdminProductsQueryKey(buildAdminProductListQueryParams({ search: 'villain' })),
      scopeKey,
    )).toBe(false);
  });
});
