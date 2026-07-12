import { describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import type { IProductListPage } from '@/interfaces/product';
import {
  getPublicCollections,
  getPublicProductsPage,
} from '@/lib/api/public-storefront';
import { createProductCard } from '@/tests/fixtures';

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    siteUrl: 'https://www.popboxstudio.com',
  }),
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicCollections: vi.fn(),
  getPublicProductsPage: vi.fn(),
}));

function createSitemapProduct(
  overrides: Parameters<typeof createProductCard>[0] = {},
): IProductListPage['items'][number] {
  return createProductCard(overrides);
}

describe('sitemap', () => {
  it('includes core pages, active collections, active products, deduped urls, and product lastModified', async () => {
    vi.mocked(getPublicCollections).mockResolvedValue([
      {
        description: null,
        id: 'collection-1',
        isActive: true,
        name: 'Featured',
        slug: 'featured',
        sortOrder: 0,
      },
      {
        description: null,
        id: 'collection-2',
        isActive: false,
        name: 'Draft',
        slug: 'draft',
        sortOrder: 1,
      },
    ]);
    vi.mocked(getPublicProductsPage).mockResolvedValue({
      items: [
        createSitemapProduct({
          slug: 'kuji-cardcaptor-sakura-25th-anniversary',
          updatedAt: '2026-07-10T01:41:45.871Z',
        }),
        createSitemapProduct({
          id: 'product-2',
          name: 'Second Figure',
          slug: 'second-figure',
          updatedAt: '2026-04-03T11:30:00.000Z',
        }),
        createSitemapProduct({
          id: 'product-3',
          name: 'Archived Figure',
          slug: 'archived-figure',
          status: 'archived',
          updatedAt: '2026-04-04T10:00:00.000Z',
        }),
        createSitemapProduct({
          id: 'product-4',
          name: 'Draft Figure',
          slug: 'draft-figure',
          status: 'draft',
          updatedAt: '2026-04-05T10:00:00.000Z',
        }),
        createSitemapProduct({
          slug: 'kuji-cardcaptor-sakura-25th-anniversary',
          updatedAt: '2026-07-10T01:41:45.871Z',
        }),
      ],
      nextCursor: null,
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const productEntry = entries.find(
      (entry) => entry.url === 'https://www.popboxstudio.com/products/kuji-cardcaptor-sakura-25th-anniversary',
    );
    const secondProductEntry = entries.find((entry) => entry.url === 'https://www.popboxstudio.com/products/second-figure');
    const staticEntry = entries.find((entry) => entry.url === 'https://www.popboxstudio.com/');
    const collectionEntry = entries.find((entry) => entry.url === 'https://www.popboxstudio.com/collections/featured');

    expect(urls).toContain('https://www.popboxstudio.com/');
    expect(urls).toContain('https://www.popboxstudio.com/products');
    expect(urls).toContain('https://www.popboxstudio.com/products?type=kuji');
    expect(urls).toContain('https://www.popboxstudio.com/collections/featured');
    expect(urls).not.toContain('https://www.popboxstudio.com/collections/draft');
    expect(urls).not.toContain('https://www.popboxstudio.com/products/archived-figure');
    expect(urls).not.toContain('https://www.popboxstudio.com/products/draft-figure');
    expect(
      urls.filter(
        (url) => url === 'https://www.popboxstudio.com/products/kuji-cardcaptor-sakura-25th-anniversary',
      ),
    ).toHaveLength(1);
    expect(productEntry?.lastModified).toEqual(new Date('2026-07-10T01:41:45.871Z'));
    expect(secondProductEntry?.lastModified).toEqual(new Date('2026-04-03T11:30:00.000Z'));
    expect(staticEntry).not.toHaveProperty('lastModified');
    expect(collectionEntry).not.toHaveProperty('lastModified');
  });

  it('still includes products when collections fail', async () => {
    vi.mocked(getPublicCollections).mockRejectedValue(new Error('collections unavailable'));
    vi.mocked(getPublicProductsPage).mockResolvedValue({
      items: [
        createSitemapProduct({
          id: 'product-3',
          name: 'Fallback Figure',
          slug: 'fallback-figure',
          updatedAt: '2026-04-04T10:00:00.000Z',
        }),
      ],
      nextCursor: null,
    });

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toContain('https://www.popboxstudio.com/products/fallback-figure');
  });

  it('keeps an active product with an invalid timestamp without emitting lastModified', async () => {
    vi.mocked(getPublicCollections).mockResolvedValue([]);
    vi.mocked(getPublicProductsPage).mockResolvedValue({
      items: [
        createSitemapProduct({
          id: 'product-invalid-date',
          name: 'Invalid Date Figure',
          slug: 'invalid-date-figure',
          updatedAt: 'not-a-date',
        }),
      ],
      nextCursor: null,
    });

    const entries = await sitemap();
    const productEntry = entries.find(
      (entry) => entry.url === 'https://www.popboxstudio.com/products/invalid-date-figure',
    );

    expect(productEntry).toBeDefined();
    expect(productEntry).not.toHaveProperty('lastModified');
  });
});
