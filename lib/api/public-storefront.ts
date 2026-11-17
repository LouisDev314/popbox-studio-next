import 'server-only';

import axios, { type AxiosRequestConfig } from 'axios';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import getPublicEnvConfig from '@/configs/public-env';
import { PUBLIC_COLLECTIONS_CACHE_TAG, PUBLIC_TAGS_CACHE_TAG } from '@/lib/api/public-cache-tags';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { ICheckoutSuccess } from '@/interfaces/checkout';
import type { IHomepageData } from '@/interfaces/home';
import type { IFaqListResponse, IPublicFaqItem, IPublicLegalDocument, LegalDocumentType } from '@/interfaces/legal';
import type { IGuestOrderDetail, IGuestTicketView } from '@/interfaces/order';
import type {
  IProduct,
  IProductListPage,
  IProductRecommendationsResponse,
  ICollection,
  ITag,
  productSort,
  productType,
} from '@/interfaces/product';
import type { IShippingSettings } from '@/interfaces/shipping';
import { normalizePublicShippingSettings } from '@/utils/shipping';

export type PublicProductListFilters = {
  collection?: string;
  cursor?: string;
  sort?: productSort;
  tag?: string;
  type?: productType;
};

const publicApiBaseUrl = getPublicEnvConfig().apiBaseUrl.replace(/\/$/, '');
const publicStorefrontClient = axios.create({
  baseURL: publicApiBaseUrl,
  timeout: 10_000,
});

type PublicRequestOptions = Pick<AxiosRequestConfig, 'signal' | 'timeout'>;

function withCookieHeader(
  config: AxiosRequestConfig | undefined,
  cookieHeader: string | undefined,
): AxiosRequestConfig | undefined {
  if (!cookieHeader) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...config?.headers,
      Cookie: cookieHeader,
    },
  };
}

async function readPublicData<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await publicStorefrontClient.get<IBaseApiResponse<T>>(path, config);
  return response.data.data;
}

function normalizeFaqItems(
  payload: IPublicFaqItem[] | IFaqListResponse<IPublicFaqItem> | null | undefined,
): IPublicFaqItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

export const getPublicHomepageData = cache(async (): Promise<IHomepageData> => {
  return readPublicData<IHomepageData>('/api/v1/home');
});

export async function getPublicProductsPage(
  filters: PublicProductListFilters,
  requestOptions?: PublicRequestOptions,
): Promise<IProductListPage> {
  return readPublicData<IProductListPage>('/api/v1/products', {
    ...requestOptions,
    params: {
      collection: filters.collection,
      cursor: filters.cursor,
      sort: filters.sort,
      tag: filters.tag,
      type: filters.type,
    },
  });
}

export const getPublicProductBySlug = cache(async (slug: string): Promise<IProduct> => {
  return readPublicData<IProduct>(`/api/v1/products/${slug}`);
});

export const getPublicProductRecommendations = cache(
  async (slug: string): Promise<IProductRecommendationsResponse> => {
    return readPublicData<IProductRecommendationsResponse>(`/api/v1/products/${slug}/recommendations`);
  },
);

export async function getPublicSearchResults(query: string): Promise<IProductListPage> {
  return readPublicData<IProductListPage>('/api/v1/search', {
    params: {
      q: query,
    },
  });
}

export async function getPublicCheckoutSuccess(sessionId: string): Promise<ICheckoutSuccess> {
  return readPublicData<ICheckoutSuccess>('/api/v1/checkout/success', {
    params: {
      session_id: sessionId,
    },
  });
}

export const getPublicLegalDocument = cache(
  async (type: LegalDocumentType): Promise<IPublicLegalDocument> => {
    return readPublicData<IPublicLegalDocument>(`/api/v1/legal/${type}`);
  },
);

export const getPublicShippingSettings = cache(async (): Promise<IShippingSettings> => {
  const settings = await readPublicData<unknown>('/api/v1/settings/shipping');

  return normalizePublicShippingSettings(settings);
});

export const getPublicFaqItems = cache(async (): Promise<IPublicFaqItem[]> => {
  const payload = await readPublicData<IPublicFaqItem[] | IFaqListResponse<IPublicFaqItem>>('/api/v1/legal/faq');
  return normalizeFaqItems(payload);
});

async function readPublicCollections(requestOptions?: PublicRequestOptions): Promise<ICollection[]> {
  const collections = await readPublicData<ICollection[]>('/api/v1/collections', requestOptions);
  if (!Array.isArray(collections)) {
    throw new Error('Invalid public collections response.');
  }
  return collections;
}

const getCachedCollections = unstable_cache(
  () => readPublicCollections(),
  ['storefront-collections-v1', publicApiBaseUrl],
  { revalidate: 300, tags: [PUBLIC_COLLECTIONS_CACHE_TAG] },
);

export const getPublicCollections = cache(async (
  requestOptions?: PublicRequestOptions,
): Promise<ICollection[]> => {
  // Explicit cancellation/timeout options are for the all-or-nothing sitemap traversal.
  // They must not become part of a persistent cache key.
  return requestOptions ? readPublicCollections(requestOptions) : getCachedCollections();
});

const getCachedTags = unstable_cache(
  async (): Promise<ITag[]> => {
    const tags = await readPublicData<ITag[]>('/api/v1/tags');
    if (!Array.isArray(tags)) {
      throw new Error('Invalid public tags response.');
    }
    return tags;
  },
  ['storefront-tags-v1', publicApiBaseUrl],
  { revalidate: 300, tags: [PUBLIC_TAGS_CACHE_TAG] },
);

export const getPublicTags = cache(getCachedTags);

export async function getPublicGuestOrder(
  publicId: string,
  cookieHeader?: string,
): Promise<IGuestOrderDetail> {
  return readPublicData<IGuestOrderDetail>(
    `/api/v1/orders/${publicId}`,
    withCookieHeader(undefined, cookieHeader),
  );
}

export async function getPublicGuestTickets(
  publicId: string,
  cookieHeader?: string,
): Promise<IGuestTicketView> {
  return readPublicData<IGuestTicketView>(
    `/api/v1/orders/${publicId}/tickets`,
    withCookieHeader(undefined, cookieHeader),
  );
}

export function isPublicApiNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function getPublicApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return error.response?.status ?? null;
}
