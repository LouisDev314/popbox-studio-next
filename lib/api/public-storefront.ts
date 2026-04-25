import 'server-only';

import axios, { type AxiosRequestConfig } from 'axios';
import { cache } from 'react';
import getPublicEnvConfig from '@/configs/public-env';
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

export type PublicProductListFilters = {
  collection?: string;
  cursor?: string;
  sort?: productSort;
  tag?: string;
  type?: productType;
};

const publicStorefrontClient = axios.create({
  baseURL: getPublicEnvConfig().apiBaseUrl.replace(/\/$/, ''),
});

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
): Promise<IProductListPage> {
  return readPublicData<IProductListPage>('/api/v1/products', {
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
  return readPublicData<IShippingSettings>('/api/v1/settings/shipping');
});

export const getPublicFaqItems = cache(async (): Promise<IPublicFaqItem[]> => {
  const payload = await readPublicData<IPublicFaqItem[] | IFaqListResponse<IPublicFaqItem>>('/api/v1/legal/faq');
  return normalizeFaqItems(payload);
});

export const getPublicCollections = cache(async (): Promise<ICollection[]> => {
  return readPublicData<ICollection[]>('/api/v1/collections');
});

export const getPublicTags = cache(async (): Promise<ITag[]> => {
  return readPublicData<ITag[]>('/api/v1/tags');
});

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
