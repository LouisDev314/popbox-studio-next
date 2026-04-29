/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('ProductTileDense', () => {
  it('renders the kuji badge for kuji storefront cards', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'kuji-product',
          name: 'Kuji Product',
          slug: 'kuji-product',
          productType: 'kuji',
          ticketSummary: {
            remainingTickets: 23,
            totalTickets: 80,
          },
        })}
      />,
    );

    expect(screen.getByRole('img', { name: 'Kuji' })).toBeInTheDocument();
  });

  it('does not render a ticket summary for non-kuji cards', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'standard-product',
          name: 'Standard Product',
          slug: 'standard-product',
        })}
      />,
    );

    expect(screen.queryByText(/tickets$/)).not.toBeInTheDocument();
  });

  it('uses the second sorted image for kuji product covers when available', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'kuji-product',
          name: 'Kuji Product',
          slug: 'kuji-product',
          productType: 'kuji',
          images: [
            {
              id: 'cover-image',
              storageKey: 'products/kuji-cover.jpg',
              altText: 'Square product cover',
              sortOrder: 1,
              url: 'https://example.com/products/kuji-cover.jpg',
            },
            {
              id: 'banner-image',
              storageKey: 'products/kuji-banner.jpg',
              altText: 'Wide banner art',
              sortOrder: 0,
              url: 'https://example.com/products/kuji-banner.jpg',
            },
          ],
        })}
      />,
    );

    expect(screen.getByAltText('Square product cover')).toHaveAttribute('src', 'https://example.com/products/kuji-cover.jpg');
    expect(screen.queryByAltText('Wide banner art')).not.toBeInTheDocument();
  });

  it('falls back to the first sorted image for kuji covers when no second image exists', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'kuji-product',
          name: 'Kuji Product',
          slug: 'kuji-product',
          productType: 'kuji',
          images: [
            {
              id: 'only-image',
              storageKey: 'products/kuji-only.jpg',
              altText: 'Only kuji image',
              sortOrder: 3,
              url: 'https://example.com/products/kuji-only.jpg',
            },
          ],
        })}
      />,
    );

    expect(screen.getByAltText('Only kuji image')).toHaveAttribute('src', 'https://example.com/products/kuji-only.jpg');
  });

  it('keeps the first sorted image for standard product covers', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'standard-product',
          name: 'Standard Product',
          slug: 'standard-product',
          images: [
            {
              id: 'secondary-image',
              storageKey: 'products/standard-secondary.jpg',
              altText: 'Secondary standard image',
              sortOrder: 1,
              url: 'https://example.com/products/standard-secondary.jpg',
            },
            {
              id: 'primary-image',
              storageKey: 'products/standard-primary.jpg',
              altText: 'Primary standard image',
              sortOrder: 0,
              url: 'https://example.com/products/standard-primary.jpg',
            },
          ],
        })}
      />,
    );

    expect(screen.getByAltText('Primary standard image')).toHaveAttribute('src', 'https://example.com/products/standard-primary.jpg');
    expect(screen.queryByAltText('Secondary standard image')).not.toBeInTheDocument();
  });
});
