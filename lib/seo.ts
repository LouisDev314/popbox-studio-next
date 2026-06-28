import type { Metadata } from 'next';
import getPublicEnvConfig from '@/configs/public-env';
import type { IProduct, IProductCard } from '@/interfaces/product';
import type { IShippingSettings } from '@/interfaces/shipping';
import {
  getFirstParamValue,
  parseProductTypeParam,
} from '@/lib/storefront-product-filters';
import { getProductCoverImage, getSortedProductImages } from '@/utils/product-images';
import { getProductInventoryState } from '@/utils/product-stock';

export const BRAND_NAME = 'PopBox Studio';
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';
export const DEFAULT_SITE_DESCRIPTION =
  'PopBox Studio is a premium anime store in Canada for collectors shopping anime figures, collectibles, plushies, cards, gifts, and Ichiban Kuji online.';
export const SITE_LOCALE = 'en_CA';
export const SITE_LANGUAGE = 'en-CA';

const SOCIAL_PROFILE_URLS = [
  'https://www.tiktok.com/@popbox_studio',
  'https://www.instagram.com/popbox_studio/',
  'https://www.facebook.com/p/PopBox-Studio-61574809973184/',
];

type SearchParamValue = string | string[] | undefined;
type JsonLdPrimitive = string | number | boolean | null;
type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];
type JsonLdObject = {
  [key: string]: JsonLdValue | undefined;
};

export type TRouteSearchParams = Record<string, SearchParamValue>;

export type TBreadcrumbJsonLdItem = {
  name: string;
  path: string;
};

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

type TProductJsonLdOptions = {
  canonicalPath: string;
  shippingSettings?: IShippingSettings | null;
};

function hasMeaningfulValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value.some((entry) => entry.trim().length > 0);
  }

  return !!value?.trim().length;
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

export function getDefaultRobots(): NonNullable<Metadata['robots']> {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
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
    applicationName: BRAND_NAME,
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
    robots: getDefaultRobots(),
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

export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: BRAND_NAME,
    url: buildAbsoluteUrl('/'),
    logo: buildAbsoluteUrl('/store-logo.png'),
    description: DEFAULT_SITE_DESCRIPTION,
    sameAs: SOCIAL_PROFILE_URLS,
  };
}

export function buildWebsiteJsonLd(description = DEFAULT_SITE_DESCRIPTION): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: buildAbsoluteUrl('/'),
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${buildAbsoluteUrl('/search/results')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbListJsonLd(items: TBreadcrumbJsonLdItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  };
}

function getProductOfferAvailability(product: IProduct | IProductCard): string | undefined {
  const inventoryState = getProductInventoryState(product);

  if (!inventoryState.hasInventoryData) {
    return undefined;
  }

  if (inventoryState.status === 'sold_out') {
    return 'https://schema.org/OutOfStock';
  }

  if (inventoryState.status === 'low_stock') {
    return 'https://schema.org/LimitedAvailability';
  }

  return 'https://schema.org/InStock';
}

function buildOfferShippingDetailsJsonLd(
  shippingSettings: IShippingSettings | null | undefined,
): JsonLdObject | undefined {
  if (!shippingSettings) {
    return undefined;
  }

  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'CA',
    },
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: (shippingSettings.flatShippingCents / 100).toFixed(2),
      currency: shippingSettings.currency,
    },
  };
}

export function buildProductJsonLd(
  product: IProduct,
  options: TProductJsonLdOptions,
): JsonLdObject {
  const canonicalUrl = buildAbsoluteUrl(options.canonicalPath);
  const productImages = getSortedProductImages(product)
    .map((image) => image.url)
    .filter((url) => url.trim().length > 0);
  const shippingDetails = buildOfferShippingDetailsJsonLd(options.shippingSettings);
  const offerAvailability = getProductOfferAvailability(product);
  const productDescription = product.description?.trim() || product.name;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productDescription,
    url: canonicalUrl,
    image: productImages,
    category: product.productType === 'kuji' ? 'Ichiban Kuji' : 'Anime merchandise',
    ...(product.sku
      ? {
        sku: product.sku,
      }
      : {}),
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: BRAND_NAME,
      },
      ...(offerAvailability
        ? {
          availability: offerAvailability,
        }
        : {}),
      ...(shippingDetails
        ? {
          shippingDetails,
        }
        : {}),
    },
  };
}

export function buildProductItemListJsonLd(
  products: IProductCard[],
  path: string,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: buildAbsoluteUrl(path),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const coverImage = getProductCoverImage(product);

      return {
        '@type': 'ListItem',
        position: index + 1,
        url: buildAbsoluteUrl(`/products/${product.slug}`),
        item: {
          '@type': 'Product',
          name: product.name,
          url: buildAbsoluteUrl(`/products/${product.slug}`),
          ...(coverImage?.url
            ? {
              image: coverImage.url,
            }
            : {}),
        },
      };
    }),
  };
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
