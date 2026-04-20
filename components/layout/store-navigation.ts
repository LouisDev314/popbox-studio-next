import { ICollection } from '@/interfaces/product';
import { parseProductSortParam, type storefrontProductSort } from '@/lib/storefront-product-filters';

export interface IStoreCollectionNavItem {
  description: string;
  href: string;
  label: string;
}

export type TTopLevelNavKey = 'show-all' | 'featured' | 'trending' | 'kuji' | 'standard' | 'collections';

type TStorefrontSearchParamReader = Pick<URLSearchParams, 'get'>;
type TStorefrontSearchParamSerializer = Pick<URLSearchParams, 'toString'>;

export const FEATURED_NAV_HREF = '/collections/featured';
export const TRENDING_NAV_HREF = '/products?sort=trending';

export const DESKTOP_PRIMARY_NAV_ITEMS = [
  { key: 'show-all', href: '/products', label: 'Show All' },
  { key: 'trending', href: TRENDING_NAV_HREF, label: 'Trending' },
  { key: 'featured', href: FEATURED_NAV_HREF, label: 'Featured' },
  { key: 'kuji', href: '/products?type=kuji', label: 'Ichiban Kuji' },
  { key: 'standard', href: '/products?type=standard', label: 'Anime Merchandise' },
] as const;

export const MOBILE_PRIMARY_NAV_ITEMS = [
  {
    key: 'show-all',
    label: 'Show All',
    href: '/products',
    description: 'Browse every figure, collectible, and PopBox Studio release.',
  },
  {
    key: 'featured',
    label: 'Featured',
    href: FEATURED_NAV_HREF,
    description: 'Browse the featured storefront drops already highlighted on the home page.',
  },
  {
    key: 'trending',
    label: 'Trending',
    href: TRENDING_NAV_HREF,
    description: 'Browse the backend-ranked products trending across the storefront right now.',
  },
  {
    key: 'kuji',
    label: 'Ichiban Kuji',
    href: '/products?type=kuji',
    description: 'Premium lottery-style prizes and ticket-based launches.',
  },
  {
    key: 'standard',
    label: 'Anime Merchandise',
    href: '/products?type=standard',
    description: 'Browse figures, collectibles, and standard merchandise releases.',
  },
] as const;

function normalizeStorefrontPathname(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '');
  return normalizedPathname || '/';
}

function buildHref(pathname: string, searchParams: URLSearchParams) {
  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function getProductsRoutePathname() {
  return TRENDING_NAV_HREF.split('?')[0] ?? '/products';
}

function getCollectionSlugFromHref(href: string) {
  if (!href.startsWith('/collections/')) {
    return null;
  }

  return decodeURIComponent(href.replace('/collections/', ''));
}

function isNavHrefActive(
  href: string,
  pathname: string,
  searchParams: TStorefrontSearchParamReader,
) {
  const targetCollectionSlug = getCollectionSlugFromHref(href);

  if (targetCollectionSlug) {
    return pathname === `/collections/${targetCollectionSlug}` || searchParams.get('collection') === targetCollectionSlug;
  }

  const [targetPathname, queryString] = href.split('?');
  if (pathname !== normalizeStorefrontPathname(targetPathname)) {
    return false;
  }

  const targetSearchParams = new URLSearchParams(queryString ?? '');

  for (const [key, value] of targetSearchParams.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function getActiveTopLevelNavKey(
  pathname: string,
  searchParams: TStorefrontSearchParamReader,
): TTopLevelNavKey | null {
  const normalizedPathname = normalizeStorefrontPathname(pathname);
  const currentCollectionSlug = searchParams.get('collection');
  const currentType = searchParams.get('type');

  if (isNavHrefActive(FEATURED_NAV_HREF, normalizedPathname, searchParams)) {
    return 'featured';
  }

  if (
    currentCollectionSlug ||
    normalizedPathname === '/collections' ||
    normalizedPathname.startsWith('/collections/')
  ) {
    return 'collections';
  }

  if (normalizedPathname !== '/products') {
    return null;
  }

  if (isNavHrefActive(TRENDING_NAV_HREF, normalizedPathname, searchParams)) {
    return 'trending';
  }

  if (currentType === 'kuji') {
    return 'kuji';
  }

  if (currentType === 'standard') {
    return 'standard';
  }

  return 'show-all';
}

export function isCollectionsNavActive(pathname: string, searchParams: TStorefrontSearchParamReader) {
  return getActiveTopLevelNavKey(pathname, searchParams) === 'collections';
}

export function isTopLevelNavItemActive(
  pathname: string,
  searchParams: TStorefrontSearchParamReader,
  key: Exclude<TTopLevelNavKey, 'collections'>,
) {
  return getActiveTopLevelNavKey(pathname, searchParams) === key;
}

export function isStoreNavItemActive(
  pathname: string,
  searchParams: TStorefrontSearchParamReader,
  href: string,
) {
  return isNavHrefActive(href, normalizeStorefrontPathname(pathname), searchParams);
}

export function getStorefrontSortValue(
  pathname: string,
  searchParams: TStorefrontSearchParamReader,
): storefrontProductSort {
  const explicitSort = parseProductSortParam(searchParams.get('sort') ?? undefined);
  const normalizedPathname = normalizeStorefrontPathname(pathname);

  if (explicitSort) {
    return explicitSort;
  }

  if (normalizedPathname === FEATURED_NAV_HREF) {
    return 'featured';
  }

  return 'newest';
}

export function getStorefrontSortHref({
  pathname,
  searchParams,
  sort,
}: {
  pathname: string;
  searchParams: TStorefrontSearchParamReader & TStorefrontSearchParamSerializer;
  sort: storefrontProductSort;
}) {
  const normalizedPathname = normalizeStorefrontPathname(pathname);
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  nextSearchParams.delete('collection');
  nextSearchParams.delete('cursor');

  if (sort === 'featured') {
    nextSearchParams.delete('sort');
    return buildHref(FEATURED_NAV_HREF, nextSearchParams);
  }

  if (sort === 'trending') {
    nextSearchParams.set('sort', 'trending');
    return buildHref(getProductsRoutePathname(), nextSearchParams);
  }

  nextSearchParams.set('sort', sort);

  if (normalizedPathname === FEATURED_NAV_HREF) {
    return buildHref(getProductsRoutePathname(), nextSearchParams);
  }

  if (normalizedPathname.startsWith('/collections/')) {
    return buildHref(normalizedPathname, nextSearchParams);
  }

  return buildHref(getProductsRoutePathname(), nextSearchParams);
}

export function mapCollectionToNavItem(collection: ICollection): IStoreCollectionNavItem {
  return {
    label: collection.name,
    href: `/collections/${encodeURIComponent(collection.slug)}`,
    description: `Browse the ${collection.name} collection.`,
  };
}
