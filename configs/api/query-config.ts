import httpClient from '@/api/http-client';
import { type AxiosRequestConfig, AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { withAdminAuth } from '@/lib/api/admin-client';
import { buildAdminProductListQueryParams, buildAdminProductsRequestParams, IAdminProductListQueryParams } from '@/lib/admin-product-filters';
import { buildAdminOrdersRequestParams, IAdminOrderListQueryParams } from '@/lib/admin-order-filters';
import { ICollection, ITag,
  IProductSuggestionResponse, IAdminProductDetail, IAdminProductListResponse, IKujiPrize,
} from '@/interfaces/product';
import { IAdminOrderDetail, IGuestTicketView, IAdminOrderListResponse } from '@/interfaces/order';
import { ICheckoutSuccess } from '@/interfaces/checkout';
import { IFaqListResponse, IAdminFaqItem, IAdminFaqListResponse, IAdminLegalListResponse } from '@/interfaces/legal';
import { IShippingSettings } from '@/interfaces/shipping';
import { IStoreBannerSettings } from '@/interfaces/settings';
import type {
  IAccountOrderListPage,
  IAccountProfile,
  ICustomerOrderDetail,
  IKujiHistoryPage,
} from '@/interfaces/account';
import { customerGet } from '@/lib/api/customer-client';

function normalizeAdminFaqItems(
  payload: IAdminFaqItem[] | IFaqListResponse<IAdminFaqItem> | null | undefined,
): IAdminFaqItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

const QueryConfigs = {
  fetchAutocomplete: (query: string): Promise<AxiosResponse<IBaseApiResponse<IProductSuggestionResponse>>> => {
    return httpClient.get('/api/v1/search/autocomplete', {
      params: {
        q: query,
      },
    });
  },
  fetchCheckoutSuccess: (sessionId: string): Promise<AxiosResponse<IBaseApiResponse<ICheckoutSuccess>>> => {
    return httpClient.get('/api/v1/checkout/success', {
      params: {
        session_id: sessionId,
      },
    });
  },
  fetchPublicStoreBanner: (): Promise<AxiosResponse<IBaseApiResponse<IStoreBannerSettings>>> => {
    return httpClient.get('/api/v1/settings/store-banner');
  },
  fetchPublicShippingSettings: (): Promise<AxiosResponse<IBaseApiResponse<IShippingSettings>>> => {
    return httpClient.get('/api/v1/settings/shipping');
  },
  fetchGuestTickets: (id: string): Promise<AxiosResponse<IBaseApiResponse<IGuestTicketView>>> => {
    return httpClient.get(`/api/v1/orders/${id}/tickets`);
  },
  fetchAccountProfile: (config?: AxiosRequestConfig): Promise<AxiosResponse<IBaseApiResponse<IAccountProfile>>> => {
    return customerGet('/api/v1/account/profile', config);
  },
  fetchAccountOrders: (cursor?: string): Promise<AxiosResponse<IBaseApiResponse<IAccountOrderListPage>>> => {
    return customerGet('/api/v1/account/orders', { params: { cursor, limit: 20 } });
  },
  fetchAccountOrder: (publicId: string): Promise<AxiosResponse<IBaseApiResponse<ICustomerOrderDetail>>> => {
    return customerGet(`/api/v1/account/orders/${encodeURIComponent(publicId)}`);
  },
  fetchAccountKujiHistory: (cursor?: string): Promise<AxiosResponse<IBaseApiResponse<IKujiHistoryPage>>> => {
    return customerGet('/api/v1/account/kuji-history', { params: { cursor, limit: 20 } });
  },
  fetchAdminProducts: async (
    filters: Partial<IAdminProductListQueryParams> = {},
  ): Promise<AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>> => {
    return httpClient.get('/api/v1/admin/products', await withAdminAuth({
      params: buildAdminProductsRequestParams(buildAdminProductListQueryParams(filters)),
    }));
  },
  fetchAdminProduct: async (id: string): Promise<AxiosResponse<IBaseApiResponse<IAdminProductDetail>>> => {
    return httpClient.get(`/api/v1/admin/products/${id}`, await withAdminAuth());
  },
  fetchAdminOrders: async (
    filters: IAdminOrderListQueryParams,
  ): Promise<AxiosResponse<IBaseApiResponse<IAdminOrderListResponse>>> => {
    return httpClient.get('/api/v1/admin/orders', await withAdminAuth({
      params: buildAdminOrdersRequestParams(filters),
    }));
  },
  fetchAdminOrder: async (adminOrderId: string): Promise<AxiosResponse<IBaseApiResponse<IAdminOrderDetail>>> => {
    return httpClient.get(`/api/v1/admin/orders/${adminOrderId}`, await withAdminAuth());
  },
  fetchAdminCollections: async (): Promise<AxiosResponse<IBaseApiResponse<ICollection[]>>> => {
    return httpClient.get('/api/v1/admin/collections', await withAdminAuth());
  },
  fetchAdminTags: async (): Promise<AxiosResponse<IBaseApiResponse<ITag[]>>> => {
    return httpClient.get('/api/v1/admin/tags', await withAdminAuth());
  },
  fetchAdminProductKujiPrizes: async (productId: string): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize[]>>> => {
    return httpClient.get(`/api/v1/admin/products/${productId}/kuji-prizes`, await withAdminAuth());
  },
  fetchAdminLegalDocs: async (): Promise<AxiosResponse<IBaseApiResponse<IAdminLegalListResponse>>> => {
    return httpClient.get('/api/v1/admin/legal', await withAdminAuth());
  },
  fetchAdminFaqItems: async (): Promise<AxiosResponse<IBaseApiResponse<IAdminFaqListResponse>>> => {
    const response = await httpClient.get<
      IBaseApiResponse<IAdminFaqItem[] | IFaqListResponse<IAdminFaqItem>>
    >('/api/v1/admin/legal/faq', await withAdminAuth());

    return {
      ...response,
      data: {
        ...response.data,
        data: {
          items: normalizeAdminFaqItems(response.data.data),
        },
      },
    };
  },
  fetchAdminShippingSettings: async (): Promise<AxiosResponse<IBaseApiResponse<IShippingSettings>>> => {
    return httpClient.get('/api/v1/admin/settings/shipping', await withAdminAuth());
  },
  fetchAdminStoreBannerSettings: async (): Promise<AxiosResponse<IBaseApiResponse<IStoreBannerSettings>>> => {
    return httpClient.get('/api/v1/admin/settings/store-banner', await withAdminAuth());
  },
};

export default QueryConfigs;
