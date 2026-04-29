/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontImage } from '@/components/ui/storefront-image';

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

describe('StorefrontImage', () => {
  it('falls back to a secondary image source before showing the text fallback', () => {
    render(
      <StorefrontImage
        src="https://example.com/products/kuji-product-product-webp"
        fallbackSrc="https://example.com/products/kuji-product-cover-webp"
        alt="Kuji product"
      />,
    );

    const image = screen.getByAltText('Kuji product');

    expect(image).toHaveAttribute('src', 'https://example.com/products/kuji-product-product-webp');

    fireEvent.error(image);

    expect(screen.getByAltText('Kuji product')).toHaveAttribute('src', 'https://example.com/products/kuji-product-cover-webp');
  });
});
