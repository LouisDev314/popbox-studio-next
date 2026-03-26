import 'server-only';

import axios, { type AxiosRequestConfig } from 'axios';
import { cache } from 'react';
import getEnvConfig from '@/configs/env';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IHomepageData } from '@/interfaces/home';
import type { IPublicLegalDocument, LegalDocumentType } from '@/interfaces/legal';
import type {
  IProduct,
  IProductListPage,
  ICollection,
  productSort,
  productType,
} from '@/interfaces/product';

export type PublicProductListFilters = {
  collection?: string;
  cursor?: string;
  sort?: productSort;
  tag?: string;
  type?: productType;
};

const publicStorefrontClient = axios.create({
  baseURL: getEnvConfig().apiBaseUrl.replace(/\/$/, ''),
});

async function readPublicData<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await publicStorefrontClient.get<IBaseApiResponse<T>>(path, config);
  return response.data.data;
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

export async function getPublicSearchResults(query: string): Promise<IProductListPage> {
  return readPublicData<IProductListPage>('/api/v1/search', {
    params: {
      q: query,
    },
  });
}

export const getPublicLegalDocument = cache(
  async (type: LegalDocumentType): Promise<IPublicLegalDocument> => {
    return readPublicData<IPublicLegalDocument>(`/api/v1/legal/${type}`);
  },
);

export const getPublicCollections = cache(async (): Promise<ICollection[]> => {
  return readPublicData<ICollection[]>('/api/v1/collections');
});

export function isPublicApiNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
