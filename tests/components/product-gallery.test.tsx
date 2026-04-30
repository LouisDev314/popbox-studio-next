/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductGallery } from '@/components/product/product-gallery';
import type { IProduct } from '@/interfaces/product';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

vi.mock('next/image', () => ({
  default: forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }>(function MockNextImage({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }, ref) {
    return <img ref={ref} {...props} alt={alt ?? ''} />;
  }),
}));

function createProduct(overrides: Partial<IProduct> = {}): IProduct {
  const productCard = createProductCard(overrides);

  return {
    ...productCard,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    kujiPrizes: overrides.kujiPrizes ?? [],
    sku: overrides.sku ?? 'SKU-001',
    tags: overrides.tags ?? [],
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('ProductGallery', () => {
  it('shows layout-stable image skeletons for the main image and thumbnails until images load', () => {
    const { container } = renderWithProviders(
      <ProductGallery
        product={createProduct({
          images: [
            {
              id: 'primary-image',
              storageKey: 'products/standard-primary.jpg',
              altText: 'Primary image',
              sortOrder: 0,
              url: 'https://example.com/products/standard-primary.jpg',
            },
            {
              id: 'secondary-image',
              storageKey: 'products/standard-secondary.jpg',
              altText: 'Secondary image',
              sortOrder: 2,
              url: 'https://example.com/products/standard-secondary.jpg',
            },
          ],
        })}
      />,
    );

    const mainFrame = container.querySelector('.relative.aspect-square.w-full');
    const firstThumbnail = screen.getByRole('button', { name: 'View image 1 of 2' });

    expect(mainFrame).not.toBeNull();
    expect(within(mainFrame as HTMLElement).getByTestId('storefront-image-skeleton')).toHaveClass(
      'absolute',
      'inset-0',
      'h-full',
      'w-full',
    );
    expect(within(firstThumbnail).getByTestId('storefront-image-skeleton')).toHaveClass(
      'absolute',
      'inset-0',
      'h-full',
      'w-full',
    );

    fireEvent.load(within(mainFrame as HTMLElement).getByAltText('Primary image'));
    fireEvent.load(within(firstThumbnail).getByAltText('Primary image'));

    expect(within(mainFrame as HTMLElement).queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();
    expect(within(firstThumbnail).queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();
  });

  it('starts kuji products on the second sorted image and keeps thumbnails usable', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <ProductGallery
        product={createProduct({
          productType: 'kuji',
          images: [
            {
              id: 'cover-image',
              storageKey: 'products/kuji-cover.jpg',
              altText: 'Square cover',
              sortOrder: 1,
              url: 'https://example.com/products/kuji-cover.jpg',
            },
            {
              id: 'banner-image',
              storageKey: 'products/kuji-banner.jpg',
              altText: 'Wide banner',
              sortOrder: 0,
              url: 'https://example.com/products/kuji-banner.jpg',
            },
          ],
        })}
      />,
    );

    const mainFrame = container.querySelector('.relative.aspect-square.w-full');

    expect(mainFrame).not.toBeNull();
    expect(within(mainFrame as HTMLElement).getByAltText('Square cover')).toHaveAttribute('src', 'https://example.com/products/kuji-cover.jpg');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View image 1 of 2' }));

    expect(within(mainFrame as HTMLElement).getByAltText('Wide banner')).toHaveAttribute('src', 'https://example.com/products/kuji-banner.jpg');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('starts standard products on the first sorted image', () => {
    const { container } = renderWithProviders(
      <ProductGallery
        product={createProduct({
          images: [
            {
              id: 'secondary-image',
              storageKey: 'products/standard-secondary.jpg',
              altText: 'Secondary image',
              sortOrder: 2,
              url: 'https://example.com/products/standard-secondary.jpg',
            },
            {
              id: 'primary-image',
              storageKey: 'products/standard-primary.jpg',
              altText: 'Primary image',
              sortOrder: 0,
              url: 'https://example.com/products/standard-primary.jpg',
            },
          ],
        })}
      />,
    );

    const mainFrame = container.querySelector('.relative.aspect-square.w-full');

    expect(mainFrame).not.toBeNull();
    expect(within(mainFrame as HTMLElement).getByAltText('Primary image')).toHaveAttribute('src', 'https://example.com/products/standard-primary.jpg');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
