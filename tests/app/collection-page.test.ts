import { describe, expect, it, vi } from 'vitest';
import { generateMetadata } from '@/app/(store)/collections/[slug]/page';
import CollectionLayout from '@/app/(store)/collections/[slug]/layout';
import { getPublicCollections } from '@/lib/api/public-storefront';

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: navigationMocks.notFound,
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicCollections: vi.fn(),
  getPublicProductsPage: vi.fn(),
  getPublicTags: vi.fn(),
}));

describe('collection page metadata', () => {
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
});
