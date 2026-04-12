import { describe, expect, it } from 'vitest';
import {
  FEATURED_NAV_HREF,
  getStorefrontSortHref,
  getStorefrontSortValue,
  TRENDING_NAV_HREF,
} from '@/components/layout/store-navigation';

function expectHref(
  href: string,
  pathname: string,
  expectedSearchParams: Record<string, string>,
) {
  const [resolvedPathname, queryString = ''] = href.split('?');
  const searchParams = new URLSearchParams(queryString);

  expect(resolvedPathname).toBe(pathname);
  expect(Object.fromEntries(searchParams.entries())).toEqual(expectedSearchParams);
}

describe('store navigation sort routing', () => {
  it('maps featured to the featured collection route', () => {
    expectHref(
      getStorefrontSortHref({
        pathname: '/products',
        searchParams: new URLSearchParams('type=kuji&tag=anime'),
        sort: 'featured',
      }),
      FEATURED_NAV_HREF,
      {
        type: 'kuji',
        tag: 'anime',
      },
    );
  });

  it('maps trending to the trending storefront route', () => {
    expectHref(
      getStorefrontSortHref({
        pathname: '/collections/featured',
        searchParams: new URLSearchParams('type=kuji&tag=anime'),
        sort: 'trending',
      }),
      '/products',
      {
        type: 'kuji',
        tag: 'anime',
        sort: 'trending',
      },
    );
    expect(TRENDING_NAV_HREF).toBe('/products?sort=trending');
  });

  it('switches from featured collection back to all products for normal sorts', () => {
    expectHref(
      getStorefrontSortHref({
        pathname: '/collections/featured',
        searchParams: new URLSearchParams('type=standard&tag=anime'),
        sort: 'newest',
      }),
      '/products',
      {
        type: 'standard',
        tag: 'anime',
        sort: 'newest',
      },
    );
  });

  it('keeps normal sorts on non-featured collection routes', () => {
    expectHref(
      getStorefrontSortHref({
        pathname: '/collections/sale',
        searchParams: new URLSearchParams('tag=anime'),
        sort: 'price_desc',
      }),
      '/collections/sale',
      {
        tag: 'anime',
        sort: 'price_desc',
      },
    );
  });

  it('derives the selected storefront sort from the current route context', () => {
    expect(getStorefrontSortValue('/collections/featured', new URLSearchParams())).toBe('featured');
    expect(getStorefrontSortValue('/products', new URLSearchParams())).toBe('newest');
    expect(getStorefrontSortValue('/products', new URLSearchParams('sort=trending'))).toBe('trending');
  });
});
