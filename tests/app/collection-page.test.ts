import { render, screen } from '@testing-library/react';
import { captureException } from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionSlugPage, { generateMetadata } from '@/app/(store)/collections/[slug]/page';
import CollectionLayout from '@/app/(store)/collections/[slug]/layout';
import ProductsPageClient from '@/app/(store)/products/products-page-client';
import { getPublicApiErrorStatus, getPublicCollections, getPublicProductsPage, getPublicTags } from '@/lib/api/public-storefront';

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: navigationMocks.notFound,
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicApiErrorStatus: vi.fn(),
  getPublicCollections: vi.fn(),
  getPublicProductsPage: vi.fn(),
  getPublicTags: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/app/(store)/products/products-page-client', () => ({ default: vi.fn(() => null) }));

describe('collection page metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('terminates metadata resolution for inactive or missing collections', async () => {
    vi.mocked(getPublicCollections).mockResolvedValue([]);

    await expect(generateMetadata({
      params: Promise.resolve({ slug: 'missing-collection' }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(navigationMocks.notFound).toHaveBeenCalledOnce();
  });

  it('terminates the collection layout before its loading boundary', async () => {
    navigationMocks.notFound.mockClear();
    vi.mocked(getPublicCollections).mockResolvedValue([]);

    await expect(CollectionLayout({
      children: null,
      params: Promise.resolve({ slug: 'missing-collection' }),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(navigationMocks.notFound).toHaveBeenCalledOnce();
  });

  it.each([429, 503, null])('renders temporary unavailability for upstream status %s without a false 404', async (status) => {
    const error = new Error(status === null ? 'Request timed out' : 'Upstream unavailable');
    vi.mocked(getPublicCollections).mockRejectedValueOnce(error);
    vi.mocked(getPublicApiErrorStatus).mockReturnValueOnce(status);

    render(await CollectionSlugPage({
      params: Promise.resolve({ slug: 'featured' }),
      searchParams: Promise.resolve({ type: 'kuji', sort: 'price_asc' }),
    }));

    expect(screen.getByRole('heading', { name: 'Collection temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Again' })).toHaveAttribute('href', '/collections/featured?type=kuji&sort=price_asc');
    expect(navigationMocks.notFound).not.toHaveBeenCalled();
    expect(getPublicProductsPage).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { operation: 'storefront.collections', upstream_status: String(status ?? 'unknown') },
    });
  });

  it('keeps unavailable metadata noindex', async () => {
    vi.mocked(getPublicCollections).mockRejectedValueOnce(new Error('Unavailable'));

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'featured' }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('keeps true missing collections as 404s after a successful taxonomy read', async () => {
    vi.mocked(getPublicCollections).mockResolvedValueOnce([]);

    await expect(CollectionSlugPage({
      params: Promise.resolve({ slug: 'missing' }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(captureException).not.toHaveBeenCalled();
  });

  it('retains empty products and URL-driven filters when a valid collection loads', async () => {
    vi.mocked(getPublicCollections).mockResolvedValueOnce([{
      id: 'featured-id', name: 'Featured', slug: 'featured', description: null, isActive: true, sortOrder: 0,
    }]);
    vi.mocked(getPublicProductsPage).mockResolvedValueOnce({ items: [], nextCursor: null });
    vi.mocked(getPublicTags).mockRejectedValueOnce(new Error('Tags unavailable'));

    render(await CollectionSlugPage({
      params: Promise.resolve({ slug: 'featured' }),
      searchParams: Promise.resolve({ type: 'kuji', sort: 'price_asc', tag: 'anime' }),
    }));

    expect(getPublicProductsPage).toHaveBeenCalledWith(expect.objectContaining({ collection: 'featured', type: 'kuji', sort: 'price_asc', tag: 'anime' }));
    expect(ProductsPageClient).toHaveBeenCalledWith(expect.objectContaining({
      availableTags: [], initialPage: { items: [], nextCursor: null }, initialType: 'kuji', initialSort: 'price_asc', initialTags: ['anime'],
    }), undefined);
  });
});
