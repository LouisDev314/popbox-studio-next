import { describe, expect, it } from 'vitest';
import { buildProductsQueryParams } from '@/configs/api/query-config';

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
