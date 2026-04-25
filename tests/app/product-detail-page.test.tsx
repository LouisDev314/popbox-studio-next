import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductDetailPage from '@/app/(store)/products/[slug]/page';
import type { IProduct } from '@/interfaces/product';

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicProductBySlug: vi.fn(async (): Promise<IProduct> => ({
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
      { id: 'collection-2', name: 'Ichiban Kuji', slug: 'ichiban-kuji' },
    ],
    images: [
      {
        id: 'image-1',
        storageKey: 'products/figure.jpg',
        altText: 'Ichiban Figure',
        sortOrder: 0,
        url: 'https://example.com/products/figure.jpg',
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
  it('renders all product collections as collection links', async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: 'ichiban-figure' }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Featured' })).toHaveAttribute('href', '/collections/featured');
    expect(screen.getByRole('link', { name: 'Ichiban Kuji' })).toHaveAttribute('href', '/collections/ichiban-kuji');
  });
});
