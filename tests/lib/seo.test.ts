import { describe, expect, it } from 'vitest';
import {
  getCollectionListingSeoState,
  getProductsListingSeoState,
} from '@/lib/seo';

describe('getProductsListingSeoState', () => {
  it('keeps the kuji landing page indexable', () => {
    expect(getProductsListingSeoState({
      type: 'kuji',
    })).toEqual({
      canonicalPath: '/products?type=kuji',
      collection: undefined,
      shouldIndex: true,
      type: 'kuji',
    });
  });

  it('canonicalizes collection query pages to the collection route and noindexes them', () => {
    expect(getProductsListingSeoState({
      collection: 'featured',
      type: 'kuji',
    })).toEqual({
      canonicalPath: '/collections/featured',
      collection: 'featured',
      shouldIndex: false,
      type: 'kuji',
    });
  });

  it('keeps extra sort parameters out of indexable catalog landing pages', () => {
    expect(getProductsListingSeoState({
      sort: 'trending',
      type: 'standard',
    })).toEqual({
      canonicalPath: '/products?type=standard',
      collection: undefined,
      shouldIndex: false,
      type: 'standard',
    });
  });

  it('treats unknown query params as non-indexable duplicates', () => {
    expect(getProductsListingSeoState({
      ref: 'campaign',
    })).toEqual({
      canonicalPath: '/products',
      collection: undefined,
      shouldIndex: false,
      type: undefined,
    });
  });
});

describe('getCollectionListingSeoState', () => {
  it('keeps the base collection page indexable', () => {
    expect(getCollectionListingSeoState('featured', {})).toEqual({
      canonicalPath: '/collections/featured',
      shouldIndex: true,
      type: undefined,
    });
  });

  it('noindexes filtered collection pages', () => {
    expect(getCollectionListingSeoState('featured', {
      tag: 'one-piece',
      type: 'kuji',
    })).toEqual({
      canonicalPath: '/collections/featured',
      shouldIndex: false,
      type: 'kuji',
    });
  });
});
