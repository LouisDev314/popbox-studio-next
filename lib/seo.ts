import type { Metadata } from 'next';
import getPublicEnvConfig from '@/configs/public-env';
import {
  getFirstParamValue,
  parseProductTypeParam,
} from '@/lib/storefront-product-filters';

export const BRAND_NAME = 'PopBox Studio';
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';
export const DEFAULT_SITE_DESCRIPTION =
  'PopBox Studio is a premium anime store in Canada for collectors shopping anime figures, collectibles, plushies, cards, gifts, and Ichiban Kuji online.';

type SearchParamValue = string | string[] | undefined;

export type TRouteSearchParams = Record<string, SearchParamValue>;

type TCreatePageMetadataOptions = {
  title?: string;
  absoluteTitle?: string;
  description: string;
  path: string;
  noIndex?: boolean;
  openGraphImages?: NonNullable<Metadata['openGraph']>['images'];
};

type TCatalogSeoState = {
  canonicalPath: string;
  shouldIndex: boolean;
  type?: 'standard' | 'kuji';
};

function hasMeaningfulValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value.some((entry) => entry.trim().length > 0);
  }

  return value?.trim().length ? true : false;
}

function getMeaningfulKeys(searchParams: TRouteSearchParams): string[] {
  return Object.entries(searchParams)
    .filter(([, value]) => hasMeaningfulValue(value))
    .map(([key]) => key);
}

function buildFullTitle(title: string) {
  return `${title} | ${BRAND_NAME}`;
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, getPublicEnvConfig().siteUrl).toString();
}

export function truncateMetaDescription(value: string, maxLength = 160) {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  const truncatedValue = normalizedValue.slice(0, maxLength + 1);
  const lastWhitespaceIndex = truncatedValue.lastIndexOf(' ');

  return `${truncatedValue.slice(0, lastWhitespaceIndex > 0 ? lastWhitespaceIndex : maxLength).trim()}...`;
}

export function buildExcerpt(value: string, fallback: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return fallback;
  }

  const [firstParagraph = normalizedValue] = normalizedValue.split(/\n\n+/);

  return truncateMetaDescription(firstParagraph, 170);
}

export function getNoIndexRobots(): NonNullable<Metadata['robots']> {
  return {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function createPageMetadata(options: TCreatePageMetadataOptions): Metadata {
  const resolvedTitle = options.absoluteTitle
    ? options.absoluteTitle
    : options.title
      ? buildFullTitle(options.title)
      : BRAND_NAME;
  const openGraphImages = options.openGraphImages ?? [
    {
      url: DEFAULT_OG_IMAGE_PATH,
      width: 1200,
      height: 630,
      alt: 'PopBox Studio anime collectibles and Ichiban Kuji',
    },
  ];
  const metadata: Metadata = {
    description: options.description,
    alternates: {
      canonical: options.path,
    },
    openGraph: {
      title: resolvedTitle,
      description: options.description,
      url: options.path,
      siteName: BRAND_NAME,
      locale: 'en_CA',
      type: 'website',
      images: openGraphImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: options.description,
      images: openGraphImages,
    },
  };

  if (options.absoluteTitle) {
    metadata.title = {
      absolute: options.absoluteTitle,
    };
  } else if (options.title) {
    metadata.title = options.title;
  }

  if (options.noIndex) {
    metadata.robots = getNoIndexRobots();
  }

  return metadata;
}

export function getProductsListingSeoState(searchParams: TRouteSearchParams): TCatalogSeoState & {
  collection?: string;
} {
  const collection = getFirstParamValue(searchParams.collection)?.trim() || undefined;
  const type = parseProductTypeParam(searchParams.type);
  const meaningfulKeys = getMeaningfulKeys(searchParams);
  const knownKeys = new Set(['collection', 'sort', 'tag', 'type']);
  const hasUnknownParams = meaningfulKeys.some((key) => !knownKeys.has(key));
  const hasSort = hasMeaningfulValue(searchParams.sort);
  const hasTag = hasMeaningfulValue(searchParams.tag);
  const hasInvalidType = hasMeaningfulValue(searchParams.type) && !type;
  const canonicalPath = collection
    ? `/collections/${encodeURIComponent(collection)}`
    : type
      ? `/products?type=${type}`
      : '/products';
  const shouldIndex =
    !collection &&
    !hasSort &&
    !hasTag &&
    !hasUnknownParams &&
    !hasInvalidType;

  return {
    canonicalPath,
    shouldIndex,
    type,
    collection,
  };
}

export function getCollectionListingSeoState(
  slug: string,
  searchParams: TRouteSearchParams,
): TCatalogSeoState {
  return {
    canonicalPath: `/collections/${encodeURIComponent(slug)}`,
    shouldIndex: getMeaningfulKeys(searchParams).length === 0,
    type: parseProductTypeParam(searchParams.type),
  };
}
