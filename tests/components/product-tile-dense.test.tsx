/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductTileDense } from '@/components/product/product-tile-dense';
import { createProductCard } from '../fixtures';
import { renderWithProviders, resetStores } from '../test-utils';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} data-next-image="true" />,
}));

describe('ProductTileDense', () => {
  beforeEach(() => {
    resetStores();
  });

  it('declares widths that match the shared two, three, and four-column grid', () => {
    renderWithProviders(<ProductTileDense product={createProductCard()} />);

    expect(screen.getByRole('img')).toHaveAttribute(
      'sizes',
      '(max-width: 639px) 46vw, (max-width: 767px) 30vw, (max-width: 1023px) 230px, (max-width: 1279px) 23vw, (max-width: 1535px) 294px, 358px',
    );
  });

  it('renders a wishlist button instead of the kuji badge for kuji storefront cards', () => {
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

    expect(screen.queryByRole('img', { name: 'Kuji' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to wishlist' })).toBeInTheDocument();
  });

  it('does not navigate to the product page when the wishlist button is clicked', async () => {
    const user = userEvent.setup();
    const product = createProductCard({
      id: 'kuji-product',
      name: 'Kuji Product',
      slug: 'kuji-product',
      productType: 'kuji',
    });

    renderWithProviders(<ProductTileDense product={product} />);

    await user.click(screen.getByRole('button', { name: 'Add to wishlist' }));

    expect(window.location.pathname).toBe('/');
  });

  it('updates the wishlist button label after toggling', async () => {
    const user = userEvent.setup();
    const product = createProductCard({
      id: 'kuji-product',
      name: 'Kuji Product',
      slug: 'kuji-product',
      productType: 'kuji',
    });

    renderWithProviders(<ProductTileDense product={product} />);

    const addButton = screen.getByRole('button', { name: 'Add to wishlist' });
    await user.click(addButton);

    expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toHaveAttribute('aria-pressed', 'true');
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

  it('uses derived product artwork for kuji cards when the list payload only includes cover-webp', () => {
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
              storageKey: 'products/kuji-product-cover-webp',
              altText: 'Kuji product cover',
              sortOrder: 0,
              url: 'https://example.com/products/kuji-product-cover-webp',
            },
          ],
        })}
      />,
    );

    expect(screen.getByAltText('Kuji product cover')).toHaveAttribute('src', 'https://example.com/products/kuji-product-product-webp');
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
