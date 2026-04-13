/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes, type ReactElement } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ProductRecommendations,
  ProductRecommendationsFallback,
} from '@/components/product/product-recommendations';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

const getPublicProductRecommendations = vi.fn();

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} />,
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicProductRecommendations: (slug: string) => getPublicProductRecommendations(slug),
}));

describe('ProductRecommendations', () => {
  it('renders recommendations with the shared product carousel instead of the dense grid', async () => {
    const currentProduct = createProductCard({
      id: 'product-1',
      name: 'Product 1',
      slug: 'product-1',
    });

    getPublicProductRecommendations.mockResolvedValue({
      items: [
        currentProduct,
        createProductCard({ id: 'product-2', name: 'Product 2', slug: 'product-2' }),
        createProductCard({ id: 'product-3', name: 'Product 3', slug: 'product-3' }),
        createProductCard({ id: 'product-4', name: 'Product 4', slug: 'product-4' }),
        createProductCard({ id: 'product-5', name: 'Product 5', slug: 'product-5' }),
      ],
      meta: {
        count: 5,
        limit: 5,
      },
    });

    const ui = await ProductRecommendations({
      product: {
        ...currentProduct,
        createdAt: '2026-04-13T00:00:00.000Z',
        kujiPrizes: [],
        sku: null,
        tags: [],
        updatedAt: '2026-04-13T00:00:00.000Z',
      },
    });

    const { container } = renderWithProviders(ui as ReactElement);

    expect(screen.getByRole('heading', { name: 'You might also like' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="product-carousel-track"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="product-grid-dense"]')).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/products/product-2"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/products/product-5"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/products/product-1"]')).not.toBeInTheDocument();
  });

  it('uses a carousel-shaped loading fallback', () => {
    const { container } = renderWithProviders(<ProductRecommendationsFallback />);

    expect(container.querySelector('[data-slot="product-carousel-skeleton"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="product-carousel-track"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="product-grid-dense-skeleton"]')).not.toBeInTheDocument();
  });
});
