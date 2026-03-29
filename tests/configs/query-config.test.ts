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
});
