/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorefrontImage } from '@/components/ui/storefront-image';

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

describe('StorefrontImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the skeleton as an overlay inside the image container until the image loads', () => {
    const { container } = render(
      <StorefrontImage
        src="https://example.com/products/figure.jpg"
        alt="Figure"
        className="rounded-2xl"
      />,
    );

    const skeleton = screen.getByTestId('storefront-image-skeleton');
    const image = screen.getByAltText('Figure');
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass('relative', 'h-full', 'w-full', 'rounded-2xl');
    expect(skeleton).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full');
    expect(image).toHaveClass('opacity-0');

    fireEvent.load(image);

    expect(screen.queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();
    expect(image).toHaveClass('opacity-100');
  });

  it('shows the skeleton again when the image source changes', () => {
    const { rerender } = render(
      <StorefrontImage
        src="https://example.com/products/figure-1.jpg"
        alt="Figure"
      />,
    );

    fireEvent.load(screen.getByAltText('Figure'));

    expect(screen.queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();

    rerender(
      <StorefrontImage
        src="https://example.com/products/figure-2.jpg"
        alt="Figure"
      />,
    );

    expect(screen.getByTestId('storefront-image-skeleton')).toBeInTheDocument();
    expect(screen.getByAltText('Figure')).toHaveAttribute('src', 'https://example.com/products/figure-2.jpg');
  });

  it('does not leave cached complete images stuck behind the skeleton', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640);

    render(
      <StorefrontImage
        src="https://example.com/products/cached-figure.jpg"
        alt="Cached figure"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByAltText('Cached figure')).toHaveClass('opacity-100');
  });

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
