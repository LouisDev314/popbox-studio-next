import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDetailPage, { generateMetadata } from '@/app/(store)/products/[slug]/page';
import ProductDetailLayout from '@/app/(store)/products/[slug]/layout';
import {
  getPublicProductBySlug,
  isPublicApiNotFoundError,
} from '@/lib/api/public-storefront';
import type { IProduct } from '@/interfaces/product';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: navigationMocks.notFound,
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicProductBySlug: vi.fn(async (): Promise<IProduct> => ({
    id: PRODUCT_ID,
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
      { id: 'collection-2', name: 'Ichiban Kuji', slug: 'ichiban-kuji' },
    ],
    images: [
      {
        id: 'image-1',
        storageKey: `products/${PRODUCT_ID}/figure.jpg`,
        altText: 'Ichiban Figure',
        sortOrder: 2,
        url: 'https://example.com/products/figure.jpg',
      },
      {
        id: 'image-2',
        storageKey: `products/${PRODUCT_ID}/front.jpg`,
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
    updatedAt: '2026-04-01T10:00:00.000Z',
  })),
  getPublicShippingSettings: vi.fn(async () => ({
    currency: 'CAD',
    flatShippingCents: 1200,
    freeShippingThresholdCents: 10000,
  })),
  isPublicApiNotFoundError: vi.fn(() => false),
}));

vi.mock('@/components/product/product-gallery', () => ({
  ProductGallery: () => <div data-testid="product-gallery" />,
}));

vi.mock('@/components/product/product-actions', () => ({
  ProductActions: () => <div data-testid="product-actions" />,
}));

vi.mock('@/components/product/product-inventory-status', () => ({
  ProductInventoryStatus: () => <div data-testid="product-inventory-status" />,
}));

vi.mock('@/components/product/product-recommendations', () => ({
  ProductRecommendations: () => <div data-testid="product-recommendations" />,
  ProductRecommendationsFallback: () => <div data-testid="product-recommendations-fallback" />,
}));

describe('ProductDetailPage', () => {
  beforeEach(() => {
    navigationMocks.notFound.mockClear();
    vi.mocked(isPublicApiNotFoundError).mockReset();
    vi.mocked(isPublicApiNotFoundError).mockReturnValue(false);
  });

  it('terminates metadata resolution for missing products before the page can stream', async () => {
    vi.mocked(getPublicProductBySlug).mockRejectedValueOnce(new Error('Product not found'));
    vi.mocked(isPublicApiNotFoundError).mockReturnValueOnce(true);

    await expect(generateMetadata({
      params: Promise.resolve({ slug: 'missing-product' }),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(navigationMocks.notFound).toHaveBeenCalledOnce();
  });

  it('terminates the detail layout before its loading boundary for missing products', async () => {
    vi.mocked(getPublicProductBySlug).mockRejectedValueOnce(new Error('Product not found'));
    vi.mocked(isPublicApiNotFoundError).mockReturnValueOnce(true);

    await expect(ProductDetailLayout({
      children: <div>Product content</div>,
      params: Promise.resolve({ slug: 'missing-product' }),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(navigationMocks.notFound).toHaveBeenCalledOnce();
  });

  it('uses the canonical SEO image for both Open Graph and Twitter metadata', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'ichiban-figure' }),
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        alt: 'Ichiban Figure front',
        url: `http://localhost:3001/media/product-images/products/${PRODUCT_ID}/front.jpg`,
      },
    ]);
    expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
  });

  it('renders all product collections as collection links', async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: 'ichiban-figure' }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Featured' })).toHaveAttribute('href', '/collections/featured');
    expect(screen.getByRole('link', { name: 'Ichiban Kuji' })).toHaveAttribute('href', '/collections/ichiban-kuji');
  });

  it('renders Product JSON-LD with real store fields and sorted images only', async () => {
    const { container } = render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: 'ichiban-figure' }),
      }),
    );

    const jsonLdScript = container.querySelector('script[type="application/ld+json"]');

    expect(jsonLdScript).not.toBeNull();

    const jsonLd = JSON.parse(jsonLdScript?.textContent ?? '[]') as Record<string, unknown>[];
    const productJsonLd = jsonLd.find((entry) => entry['@type'] === 'Product') ?? {};
    const breadcrumbJsonLd = jsonLd.find((entry) => entry['@type'] === 'BreadcrumbList') ?? {};
    const offers = productJsonLd.offers as Record<string, unknown>;
    const seller = offers.seller as Record<string, unknown>;
    const shippingDetails = offers.shippingDetails as Record<string, unknown>;

    expect(productJsonLd['@type']).toBe('Product');
    expect(productJsonLd.image).toEqual([
      `http://localhost:3001/media/product-images/products/${PRODUCT_ID}/front.jpg`,
      `http://localhost:3001/media/product-images/products/${PRODUCT_ID}/figure.jpg`,
    ]);
    expect(seller).toEqual({
      '@type': 'Organization',
      name: 'PopBox Studio',
    });
    expect(shippingDetails).toMatchObject({
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'CA',
      },
    });
    expect(breadcrumbJsonLd).toMatchObject({
      '@type': 'BreadcrumbList',
    });
    expect(productJsonLd).not.toHaveProperty('brand');
    expect(productJsonLd).not.toHaveProperty('review');
    expect(productJsonLd).not.toHaveProperty('aggregateRating');
    expect(productJsonLd).not.toHaveProperty('gtin');
  });

  it('retains breadcrumbs but omits Product JSON-LD when no valid image exists', async () => {
    vi.mocked(getPublicProductBySlug).mockResolvedValueOnce({
      id: 'product-without-image',
      name: 'Image Pending',
      slug: 'image-pending',
      description: null,
      productType: 'standard',
      status: 'active',
      priceCents: 2500,
      currency: 'CAD',
      sku: null,
      collections: [],
      images: [],
      inventory: {
        onHand: 1,
        reserved: 0,
        available: 1,
        lowStockThreshold: 0,
      },
      tags: [],
      kujiPrizes: [],
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { container } = render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: 'image-pending' }),
      }),
    );
    const jsonLdScript = container.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(jsonLdScript?.textContent ?? '[]') as Record<string, unknown>[];

    expect(jsonLd.map((entry) => entry['@type'])).toEqual(['BreadcrumbList']);
    expect(warning).toHaveBeenCalledWith(
      '[seo] Product structured data omitted because no valid image is available.',
      { productId: 'product-without-image', slug: 'image-pending' },
    );

    warning.mockRestore();
  });
});
