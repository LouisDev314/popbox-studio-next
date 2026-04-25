import { describe, expect, it } from 'vitest';
import { filterAdminProductsBySearch } from '@/lib/admin-product-filters';
import type { IAdminProductListItem } from '@/interfaces/product';

const products: IAdminProductListItem[] = [
  {
    id: 'prod-1',
    name: 'Hero (Limited)',
    slug: 'hero-limited',
    productType: 'standard',
    status: 'active',
    priceCents: 1999,
    currency: 'CAD',
    sku: 'HB-001',
    collections: [
      { id: 'collection-1', name: 'Hero Archive', slug: 'hero-archive' },
      { id: 'collection-3', name: 'Featured', slug: 'featured' },
    ],
    tags: [{ id: 'tag-1', name: 'Chase', slug: 'chase', tagType: 'character' }],
    inventory: null,
    primaryImage: null,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Kuji Hero Lottery',
    slug: 'kuji-hero-lottery',
    productType: 'kuji',
    status: 'draft',
    priceCents: 1600,
    currency: 'CAD',
    sku: 'KUJI-777',
    collections: [{ id: 'collection-2', name: 'Ichiban Kuji', slug: 'ichiban-kuji' }],
    tags: [{ id: 'tag-2', name: 'Lottery', slug: 'lottery', tagType: 'series' }],
    inventory: null,
    primaryImage: null,
    updatedAt: '2026-04-02T00:00:00.000Z',
  },
];

describe('admin product search helpers', () => {
  it('matches text search across product, collection, sku, and tag fields', () => {
    expect(filterAdminProductsBySearch(products, {
      query: 'hero archive',
    }).items.map((product) => product.id)).toEqual(['prod-1']);

    expect(filterAdminProductsBySearch(products, {
      query: 'kuji-777',
    }).items.map((product) => product.id)).toEqual(['prod-2']);

    expect(filterAdminProductsBySearch(products, {
      query: 'lottery',
    }).items.map((product) => product.id)).toEqual(['prod-2']);
  });

  it('treats special characters as literal text instead of regex patterns', () => {
    expect(filterAdminProductsBySearch(products, {
      query: '(limited)',
    }).items.map((product) => product.id)).toEqual(['prod-1']);

    expect(filterAdminProductsBySearch(products, {
      query: 'hero.*',
    }).items).toEqual([]);
  });

  it('returns all products when the search query is empty', () => {
    expect(filterAdminProductsBySearch(products, {
      query: '',
    }).items.map((product) => product.id)).toEqual(['prod-1', 'prod-2']);
  });
});
