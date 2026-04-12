import { describe, expect, it } from 'vitest';
import {
  parseProductSortParam,
  parseStorefrontProductSortParam,
} from '@/lib/storefront-product-filters';

describe('storefront product sort helpers', () => {
  it('accepts featured as a storefront-only UI sort value', () => {
    expect(parseStorefrontProductSortParam('featured')).toBe('featured');
  });

  it('parses backend-supported query sorts separately from storefront-only values', () => {
    expect(parseProductSortParam('price_desc')).toBe('price_desc');
    expect(parseProductSortParam('featured')).toBeUndefined();
  });
});
