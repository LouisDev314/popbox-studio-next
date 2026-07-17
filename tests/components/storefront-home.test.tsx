import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontHome } from '@/components/home/storefront-home';
import { createProductCard } from '@/tests/fixtures';

vi.mock('@/components/home/storefront-featured-carousel-client', () => ({
  StorefrontFeaturedCarouselClient: () => <div data-testid="featured-carousel" />,
}));

vi.mock('@/components/home/home-product-section', () => ({
  HomeProductSection: ({ title }: { title: string }) => <section data-testid={`product-section-${title}`} />,
}));

vi.mock('@/components/home/storefront-kuji-banner', () => ({
  StorefrontKujiBanner: () => <section data-testid="kuji-banner" />,
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
      name: 'Discover Anime Merchandise',
    })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('explains account benefits and renders the requested homepage section order', () => {
    render(
      <StorefrontHome
        homeData={{
          featured: [createProductCard()],
          trendingNow: [createProductCard()],
          allProductsPreview: [],
        }}
      />,
    );

    const welcomeHeading = screen.getByRole('heading', { level: 2, name: 'PopBox Studio' });
    const featuredSection = screen.getByTestId('product-section-Featured');
    const kujiBanner = screen.getByTestId('kuji-banner');
    const trendingSection = screen.getByTestId('product-section-Trending Now');

    expect(screen.getByRole('link', { name: 'Create Account' })).toHaveAttribute('href', '/account/sign-up');
    expect(screen.getByRole('link', { name: 'Browse Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByText(/Discover authentic anime collectibles from Japan/)).toBeInTheDocument();
    expect(screen.getByRole('group')).not.toHaveAttribute('open');
    expect(screen.getByText('Benefits')).toBeInTheDocument();
    expect(screen.getAllByText('Track your orders')).toHaveLength(2);
    expect(screen.getAllByText('View your Ichiban Kuji history')).toHaveLength(2);
    expect(screen.getAllByText(/Google Sign-In is an optional, secure way/)).toHaveLength(2);
    expect(welcomeHeading.compareDocumentPosition(featuredSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(featuredSection.compareDocumentPosition(kujiBanner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(kujiBanner.compareDocumentPosition(trendingSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
