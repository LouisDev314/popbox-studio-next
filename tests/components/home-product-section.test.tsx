/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeProductSection } from '@/components/home/home-product-section';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} data-priority={priority ? 'true' : undefined} />,
}));

function createProducts(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createProductCard({
      id: `product-${index + 1}`,
      name: `Product ${index + 1}`,
      slug: `product-${index + 1}`,
    }),
  );
}

describe('HomeProductSection', () => {
  it('renders featured products with the shared dense grid and applies the limit', () => {
    const { container } = renderWithProviders(
      <HomeProductSection
        title="Featured"
        products={createProducts(9)}
        limit={8}
        className="mb-16 md:mb-20"
        headerClassName="mb-5 md:mb-6"
        viewAllHref="/collections/featured"
      />,
    );

    expect(screen.getByText('Product 8')).toBeInTheDocument();
    expect(screen.queryByText('Product 9')).not.toBeInTheDocument();

    const featuredGrid = container.querySelector('[data-slot="product-grid-dense"]');

    expect(featuredGrid).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
    expect(featuredGrid).not.toHaveClass('overflow-x-auto');
  });

  it('renders dense sections with the provided limit', () => {
    const { container } = renderWithProviders(
      <HomeProductSection
        title="Trending Now"
        products={createProducts(12)}
        limit={9}
        viewAllHref="/products?sort=trending"
      />,
    );

    expect(screen.getByText('Product 9')).toBeInTheDocument();
    expect(screen.queryByText('Product 10')).not.toBeInTheDocument();

    const denseGrid = container.querySelector('[data-slot="product-grid-dense"]');

    expect(denseGrid).toBeInTheDocument();
    expect(denseGrid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
  });

  it('keeps below-hero product section images out of priority loading', () => {
    renderWithProviders(
      <HomeProductSection
        title="Explore More"
        products={createProducts(6)}
        limit={6}
        viewAllHref="/products"
      />,
    );

    const productImages = screen.getAllByRole('img', { name: /Product \d/ });

    expect(productImages).toHaveLength(6);
    expect(productImages.every((image) => !image.dataset.priority)).toBe(true);
  });
});
