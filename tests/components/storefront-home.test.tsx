import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontHome } from '@/components/home/storefront-home';
import { createProductCard } from '@/tests/fixtures';

vi.mock('@/components/home/storefront-featured-carousel-client', () => ({
  StorefrontFeaturedCarouselClient: () => <div data-testid="featured-carousel" />,
}));

vi.mock('@/components/home/home-product-section', () => ({
  HomeProductSection: () => null,
}));

vi.mock('@/components/home/storefront-kuji-banner', () => ({
  StorefrontKujiBanner: () => null,
}));

vi.mock('@/components/home/storefront-bottom-cta', () => ({
  StorefrontBottomCta: () => null,
}));

describe('StorefrontHome', () => {
  it('renders one site-level heading when featured products replace the hero', () => {
    render(
      <StorefrontHome
        homeData={{
          featured: [createProductCard()],
          trendingNow: [],
          allProductsPreview: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'PopBox Studio anime merchandise and Ichiban Kuji',
    })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('keeps the visible hero as the only heading when no featured products exist', () => {
    render(
      <StorefrontHome
        homeData={{
          featured: [],
          trendingNow: [],
          allProductsPreview: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Discover Premium Collectibles',
    })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
