import { describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import type { IProductListPage } from '@/interfaces/product';
import {
  getPublicCollections,
  getPublicProductsPage,
} from '@/lib/api/public-storefront';
import { createProductCard } from '@/tests/fixtures';

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicCollections: vi.fn(),
  getPublicProductsPage: vi.fn(),
}));

function createSitemapProduct(
  overrides: Parameters<typeof createProductCard>[0] = {},
  updatedAt?: string,
): IProductListPage['items'][number] {
  return {
    ...createProductCard(overrides),
    ...(updatedAt ? { updatedAt } : {}),
  } as IProductListPage['items'][number];
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
        createSitemapProduct({}, '2026-04-02T10:00:00.000Z'),
        createSitemapProduct({
          id: 'product-2',
          name: 'Archived Figure',
          slug: 'archived-figure',
          status: 'archived',
        },
        '2026-04-03T10:00:00.000Z',
        ),
        createSitemapProduct({}, '2026-04-02T10:00:00.000Z'),
      ],
      nextCursor: null,
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const productEntry = entries.find((entry) => entry.url === 'http://localhost:3001/products/ichiban-figure');

    expect(urls).toContain('http://localhost:3001/');
    expect(urls).toContain('http://localhost:3001/products');
    expect(urls).toContain('http://localhost:3001/products?type=kuji');
    expect(urls).toContain('http://localhost:3001/collections/featured');
    expect(urls).not.toContain('http://localhost:3001/collections/draft');
    expect(urls).not.toContain('http://localhost:3001/products/archived-figure');
    expect(urls.filter((url) => url === 'http://localhost:3001/products/ichiban-figure')).toHaveLength(1);
    expect(productEntry?.lastModified).toEqual(new Date('2026-04-02T10:00:00.000Z'));
  });

  it('still includes products when collections fail', async () => {
    vi.mocked(getPublicCollections).mockRejectedValue(new Error('collections unavailable'));
    vi.mocked(getPublicProductsPage).mockResolvedValue({
      items: [
        createSitemapProduct({
          id: 'product-3',
          name: 'Fallback Figure',
          slug: 'fallback-figure',
        },
        '2026-04-04T10:00:00.000Z',
        ),
      ],
      nextCursor: null,
    });

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toContain('http://localhost:3001/products/fallback-figure');
  });
});
