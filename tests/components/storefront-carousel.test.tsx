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
    const desktopLayout = slide?.querySelector('div.relative.lg\\:flex');
    const sharedControls = container.querySelector('.group-hover\\:opacity-100.md\\:flex');
    const scrollHintIcon = container.querySelector('svg.lucide-chevron-down');
    const scrollHint = scrollHintIcon?.closest('.xl\\:flex');

    expect(slide).toHaveClass('flex-[0_0_100%]');
    expect(slide?.className).not.toContain('lg:flex-[0_0_84%]');
    expect(link?.className).not.toContain('lg:opacity-68');
    expect(link).toHaveClass('group/slide relative block w-full');
    expect(link?.className).not.toContain('lg:max-w-6xl');
    expect(link?.className).not.toContain('lg:w-auto');
    expect(desktopLayout).toHaveClass('relative lg:flex lg:w-full lg:justify-center');
    expect(desktopLayout?.className).not.toContain('lg:max-w-304');
    expect(mediaFrame).toHaveClass('aspect-[1.85/1]', 'w-full', 'sm:aspect-[2/1]');
    expect(mediaFrame?.className).not.toContain('lg:h-[28rem]');
    expect(mediaFrame?.className).not.toContain('xl:h-[30rem]');
    expect(mediaFrame?.className).not.toContain('lg:w-[min(100%,72rem)]');
    expect(container.querySelector('.group-hover\\/slide\\:opacity-100.lg\\:block')).not.toBeInTheDocument();
    expect(scrollHint).toHaveClass('pointer-events-none', 'hidden', 'xl:flex');
    expect(sharedControls).toHaveClass('lg:left-0', 'lg:right-0', 'lg:w-full', 'lg:px-10');
    expect(sharedControls?.className).not.toContain('lg:max-w-6xl');
  });

  it('reveals only the first slide immediately and requests the capped responsive image size', () => {
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
      <StorefrontCarousel featuredProducts={products} />,
    );

    const firstImage = screen.getByAltText('Featured Release');
    const secondImage = screen.getByAltText('Second Release');
    const carouselSizes = '(max-width: 639px) 412px, (max-width: 1280px) 100vw, 1280px';

    expect(firstImage).toHaveAttribute('loading', 'eager');
    expect(firstImage).toHaveAttribute('fetchpriority', 'high');
    expect(firstImage).toHaveAttribute('sizes', carouselSizes);
    expect(firstImage).toHaveClass('opacity-100');
    expect(firstImage).not.toHaveClass('transition-opacity', 'opacity-0');

    expect(secondImage).not.toHaveAttribute('loading', 'eager');
    expect(secondImage).not.toHaveAttribute('fetchpriority', 'high');
    expect(secondImage).toHaveAttribute('sizes', carouselSizes);
    expect(secondImage).toHaveClass('opacity-0');
    expect(secondImage.parentElement?.querySelector('[data-testid="storefront-image-skeleton"]'))
      .toBeInTheDocument();
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

  it('uses the shared product cover image for kuji slides', () => {
    const products = [
      createProductCard({
        id: 'kuji-product',
        name: 'Kuji Product',
        slug: 'kuji-product',
        productType: 'kuji',
        images: [
          {
            id: 'banner-image',
            storageKey: 'products/kuji-banner.jpg',
            altText: 'Wide banner art',
            sortOrder: 0,
            url: 'https://example.com/products/kuji-banner.jpg',
          },
          {
            id: 'cover-image',
            storageKey: 'products/kuji-cover.jpg',
            altText: 'Square product cover',
            sortOrder: 1,
            url: 'https://example.com/products/kuji-cover.jpg',
          },
        ],
      }),
    ];

    renderWithProviders(
      <StorefrontCarousel featuredProducts={products} />,
    );
  });
});
