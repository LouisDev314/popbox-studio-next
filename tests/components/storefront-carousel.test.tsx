/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StorefrontCarousel } from '@/components/home/storefront-carousel';
import { StorefrontFeaturedCarouselClient } from '@/components/home/storefront-featured-carousel-client';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

const emblaRef = vi.fn();
const autoplayPlugin = {
  stop: vi.fn(),
};

let mockScrollSnaps: number[] = [];
let mockSelectedIndex = 0;

const emblaApi = {
  off: vi.fn(),
  on: vi.fn(),
  scrollNext: vi.fn(),
  scrollPrev: vi.fn(),
  scrollSnapList: vi.fn(() => mockScrollSnaps),
  scrollTo: vi.fn(),
  selectedScrollSnap: vi.fn(() => mockSelectedIndex),
};

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

vi.mock('embla-carousel-autoplay', () => ({
  default: vi.fn(() => autoplayPlugin),
}));

vi.mock('embla-carousel-react', () => ({
  default: vi.fn(() => [emblaRef, emblaApi]),
}));

describe('StorefrontCarousel', () => {
  beforeEach(() => {
    mockScrollSnaps = [];
    mockSelectedIndex = 0;
    emblaRef.mockClear();
    autoplayPlugin.stop.mockClear();
    emblaApi.off.mockClear();
    emblaApi.on.mockClear();
    emblaApi.scrollNext.mockClear();
    emblaApi.scrollPrev.mockClear();
    emblaApi.scrollTo.mockClear();
  });

  it('uses full-width slides and shared controls without preview-style desktop arrows', () => {
    const products = [
      createProductCard({
        id: 'product-1',
        name: 'Featured Release',
        slug: 'featured-release',
      }),
    ];

    const { container } = renderWithProviders(
      <StorefrontCarousel featuredProducts={products} />,
    );

    const slide = container.querySelector('.flex.touch-pan-y > div');
    const link = container.querySelector('a[href="/products/featured-release"]');
    const mediaFrame = link?.querySelector('div.relative.aspect-\\[1\\.85\\/1\\]');
    const desktopLayout = slide?.querySelector('div.relative.lg\\:mx-auto');

    expect(slide).toHaveClass('flex-[0_0_100%]');
    expect(slide?.className).not.toContain('lg:flex-[0_0_84%]');
    expect(link?.className).not.toContain('lg:opacity-68');
    expect(link).toHaveClass('group/slide relative block w-full lg:max-w-6xl');
    expect(link?.className).not.toContain('lg:w-auto');
    expect(desktopLayout).toHaveClass('relative lg:mx-auto lg:flex lg:max-w-304 lg:justify-center lg:px-6 xl:px-8');
    expect(mediaFrame).toHaveClass('w-full', 'lg:h-[28rem]');
    expect(mediaFrame?.className).not.toContain('lg:w-[min(100%,72rem)]');
    expect(container.querySelector('.group-hover\\/slide\\:opacity-100.lg\\:block')).not.toBeInTheDocument();
    expect(container.querySelector('.group-hover\\:opacity-100.md\\:flex')).toBeInTheDocument();
  });

  it('keeps arrows and dots wired through the featured carousel client', async () => {
    mockScrollSnaps = [0, 1];
    mockSelectedIndex = 1;

    const products = [
      createProductCard({
        id: 'product-1',
        name: 'Featured Release',
        slug: 'featured-release',
      }),
      createProductCard({
        id: 'product-2',
        name: 'Second Release',
        slug: 'second-release',
      }),
    ];

    renderWithProviders(
      <StorefrontFeaturedCarouselClient featuredProducts={products} />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /go to slide/i })).toHaveLength(2);
    });

    const dots = screen.getAllByRole('button', { name: /go to slide/i });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');

    fireEvent.click(dots[0]);
    expect(emblaApi.scrollTo).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getAllByLabelText('Previous slide')[0]);
    fireEvent.click(screen.getAllByLabelText('Next slide')[0]);

    expect(emblaApi.scrollPrev).toHaveBeenCalledTimes(1);
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(1);
  });
});
