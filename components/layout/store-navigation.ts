import { ICollection } from '@/interfaces/product';

export interface IStoreCollectionNavItem {
  description: string;
  href: string;
  label: string;
}

export type TTopLevelNavKey = 'show-all' | 'featured' | 'kuji' | 'standard' | 'collections';

type TStorefrontSearchParamReader = Pick<URLSearchParams, 'get'>;

export const FEATURED_NAV_HREF = '/collections/featured';

export const DESKTOP_PRIMARY_NAV_ITEMS = [
  { key: 'show-all', href: '/products', label: 'Show All' },
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

function getCollectionSlugFromHref(href: string) {
  if (!href.startsWith('/collections/')) {
    return null;
  }

  return decodeURIComponent(href.replace('/collections/', ''));
}

function isFeaturedNavActive(pathname: string, searchParams: TStorefrontSearchParamReader) {
  const featuredCollectionSlug = getCollectionSlugFromHref(FEATURED_NAV_HREF);

  if (featuredCollectionSlug) {
    return pathname === `/collections/${featuredCollectionSlug}` || searchParams.get('collection') === featuredCollectionSlug;
  }

  const [featuredPathname, queryString] = FEATURED_NAV_HREF.split('?');
  if (pathname !== featuredPathname) {
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

  if (isFeaturedNavActive(normalizedPathname, searchParams)) {
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
  const normalizedPathname = normalizeStorefrontPathname(pathname);
  const targetCollectionSlug = getCollectionSlugFromHref(href);
  const currentCollectionSlug = searchParams.get('collection');

  if (targetCollectionSlug) {
    return normalizedPathname === `/collections/${targetCollectionSlug}` || currentCollectionSlug === targetCollectionSlug;
  }

  return false;
}

export function mapCollectionToNavItem(collection: ICollection): IStoreCollectionNavItem {
  return {
    label: collection.name,
    href: `/collections/${encodeURIComponent(collection.slug)}`,
    description: `Browse the ${collection.name} collection.`,
  };
}
