/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCarousel } from '@/components/product/product-carousel';
import { ProductTileDense } from '@/components/product/product-tile-dense';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

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

describe('ProductCarousel', () => {
  it('renders shared dense tiles inside a scroll-snap carousel track', () => {
    const products = [
      createProductCard({
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
      }),
      createProductCard({
        id: 'product-2',
        name: 'Product 2',
        slug: 'product-2',
      }),
    ];

    const { container } = renderWithProviders(
      <ProductCarousel
        items={products}
        ariaLabel="Recommended products"
        renderItem={(product) => <ProductTileDense product={product} />}
      />,
    );

    const carousel = screen.getByRole('region', { name: 'Recommended products' });
    const track = container.querySelector('[data-slot="product-carousel-track"]');
    const items = container.querySelectorAll('[data-slot="product-carousel-item"]');

    expect(carousel).toHaveClass('overflow-x-auto');
    expect(track).toHaveClass('flex', 'snap-x', 'snap-mandatory');
    expect(items).toHaveLength(2);
    expect(container.querySelector('a[href="/products/product-1"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/products/product-2"]')).toBeInTheDocument();
  });
});
