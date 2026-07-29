import { describe, expect, it } from 'vitest';
import type { IAdminProductListItem, IAdminProductListResponse } from '@/interfaces/product';
import {
  flattenUniquePages,
  patchAdminProductMembershipCache,
} from '@/lib/admin-query-cache';

const featuredCollection = {
  id: 'featured',
  name: 'Featured',
  slug: 'featured',
};

function product(
  id: string,
  collections: IAdminProductListItem['collections'] = [],
): IAdminProductListItem {
  return {
    id,
    collections,
    currency: 'CAD',
    inventory: null,
    name: `Product ${id}`,
    priceCents: 1000,
    primaryImage: null,
    productType: 'standard',
    sku: null,
    slug: `product-${id}`,
    status: 'active',
    tags: [],
    updatedAt: '2026-07-29T00:00:00.000Z',
  };
}

function page(
  items: IAdminProductListItem[],
  nextCursor: string | null = null,
  totalCount = items.length,
): IAdminProductListResponse {
  return { items, nextCursor, totalCount };
}

describe('admin product cache patching', () => {
  it('returns undefined unchanged', () => {
    expect(
      patchAdminProductMembershipCache(undefined, featuredCollection, new Set()),
    ).toBeUndefined();
  });

  it('leaves unsupported response shapes unchanged', () => {
    const unsupported = { data: { items: [] }, unrelated: true };

    expect(
      patchAdminProductMembershipCache(unsupported, featuredCollection, new Set()),
    ).toBe(unsupported);
  });

  it('patches Axios list responses without replacing response metadata', () => {
    const cached = {
      data: {
        data: page([product('one')], 'next', 9),
        message: 'OK',
      },
      headers: { etag: 'list-etag' },
    };

    const patched = patchAdminProductMembershipCache(
      cached,
      featuredCollection,
      new Set(['one']),
    ) as typeof cached;

    expect(patched).not.toBe(cached);
    expect(patched.headers).toBe(cached.headers);
    expect(patched.data.data.nextCursor).toBe('next');
    expect(patched.data.data.totalCount).toBe(9);
    expect(patched.data.data.items[0].collections).toEqual([featuredCollection]);
  });

  it('patches infinite pages while preserving pages, pageParams, cursors, and metadata', () => {
    const cached = {
      pages: [
        page([product('one')], 'next', 2),
        page([product('two', [featuredCollection])], null, 2),
      ],
      pageParams: [undefined, 'next'],
      fetchedAt: 123,
    };

    const patched = patchAdminProductMembershipCache(
      cached,
      featuredCollection,
      new Set(['one']),
    ) as typeof cached;

    expect(patched.pageParams).toBe(cached.pageParams);
    expect(patched.fetchedAt).toBe(123);
    expect(patched.pages[0].nextCursor).toBe('next');
    expect(patched.pages[0].totalCount).toBe(2);
    expect(patched.pages[0].items[0].collections).toEqual([featuredCollection]);
    expect(patched.pages[1].items[0].collections).toEqual([]);
  });

  it('patches a supported product detail and leaves its other fields intact', () => {
    const cached = {
      data: {
        data: {
          id: 'one',
          collections: [],
          name: 'Detail name',
        },
      },
      status: 200,
    };

    const patched = patchAdminProductMembershipCache(
      cached,
      featuredCollection,
      new Set(['one']),
    ) as typeof cached;

    expect(patched.status).toBe(200);
    expect(patched.data.data.name).toBe('Detail name');
    expect(patched.data.data.collections).toEqual([featuredCollection]);
  });

  it('flattens pages in order and preserves the first duplicate occurrence', () => {
    const first = product('one');
    const duplicate = product('one', [featuredCollection]);
    const second = product('two');

    expect(flattenUniquePages([
      page([first]),
      page([duplicate, second]),
    ])).toEqual([first, second]);
  });
});
