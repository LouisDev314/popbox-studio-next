/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductGallery } from '@/components/product/product-gallery';
import type { IProduct } from '@/interfaces/product';
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
