import { describe, expect, it } from 'vitest';
import type { IProduct } from '@/interfaces/product';
import {
  buildBreadcrumbListJsonLd,
  buildProductItemListJsonLd,
  buildProductJsonLd,
  getCollectionListingSeoState,
  getProductsListingSeoState,
} from '@/lib/seo';
import { createProductCard } from '@/tests/fixtures';

function createProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    id: 'product-1',
    name: 'Ichiban Figure',
    slug: 'ichiban-figure',
    description: 'Premium collectible figure',
    productType: 'standard',
    status: 'active',
    priceCents: 4999,
    currency: 'CAD',
    sku: 'PB-001',
    collections: [
      { id: 'collection-1', name: 'Featured', slug: 'featured' },
    ],
    images: [
      {
        id: 'image-1',
        storageKey: 'products/figure.jpg',
        altText: 'Ichiban Figure',
        sortOrder: 1,
        url: 'https://example.com/products/figure.jpg',
      },
      {
        id: 'image-2',
        storageKey: 'products/front.jpg',
        altText: 'Ichiban Figure front',
        sortOrder: 0,
        url: 'https://example.com/products/front.jpg',
      },
    ],
    inventory: {
      onHand: 10,
      reserved: 0,
      available: 10,
      lowStockThreshold: 2,
    },
    tags: [],
    kujiPrizes: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-02T10:00:00.000Z',
    ...overrides,
  };
}

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

  it('treats featured sort on the products route as a non-canonical duplicate', () => {
    expect(getProductsListingSeoState({
      sort: 'featured',
    })).toEqual({
      canonicalPath: '/products',
      collection: undefined,
      shouldIndex: false,
      type: undefined,
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

  it('treats featured sort on a collection route as a non-canonical duplicate', () => {
    expect(getCollectionListingSeoState('featured', {
      sort: 'featured',
    })).toEqual({
      canonicalPath: '/collections/featured',
      shouldIndex: false,
      type: undefined,
    });
  });
});

describe('JSON-LD helpers', () => {
  it('builds Product JSON-LD from real product fields without fake review or brand data', () => {
    const jsonLd = buildProductJsonLd(createProduct(), {
      canonicalPath: '/products/ichiban-figure',
      shippingSettings: {
        currency: 'CAD',
        flatShippingCents: 1200,
        freeShippingThresholdCents: 10000,
      },
    });
    const offers = jsonLd.offers as Record<string, unknown>;
    const seller = offers.seller as Record<string, unknown>;
    const shippingDetails = offers.shippingDetails as Record<string, unknown>;

    expect(jsonLd).toMatchObject({
      '@type': 'Product',
      name: 'Ichiban Figure',
      sku: 'PB-001',
      url: 'http://localhost:3001/products/ichiban-figure',
      image: [
        'https://example.com/products/front.jpg',
        'https://example.com/products/figure.jpg',
      ],
    });
    expect(offers).toMatchObject({
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      price: '49.99',
      priceCurrency: 'CAD',
      url: 'http://localhost:3001/products/ichiban-figure',
    });
    expect(seller).toEqual({
      '@type': 'Organization',
      name: 'PopBox Studio',
    });
    expect(shippingDetails).toMatchObject({
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        currency: 'CAD',
        value: '12.00',
      },
    });
    expect(jsonLd).not.toHaveProperty('brand');
    expect(jsonLd).not.toHaveProperty('review');
    expect(jsonLd).not.toHaveProperty('aggregateRating');
    expect(jsonLd).not.toHaveProperty('gtin');
  });

  it('builds BreadcrumbList JSON-LD with absolute canonical item urls', () => {
    expect(buildBreadcrumbListJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Products', path: '/products' },
    ])).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: 'http://localhost:3001/',
          name: 'Home',
          position: 1,
        },
        {
          '@type': 'ListItem',
          item: 'http://localhost:3001/products',
          name: 'Products',
          position: 2,
        },
      ],
    });
  });

  it('builds product ItemList JSON-LD for listing pages', () => {
    const jsonLd = buildProductItemListJsonLd([
      createProductCard(),
      createProductCard({
        id: 'product-2',
        name: 'Kuji Ticket',
        slug: 'kuji-ticket',
      }),
    ], '/products');

    expect(jsonLd).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 2,
      url: 'http://localhost:3001/products',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'http://localhost:3001/products/ichiban-figure',
        },
        {
          '@type': 'ListItem',
          position: 2,
          url: 'http://localhost:3001/products/kuji-ticket',
        },
      ],
    });
  });
});
