import httpClient from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { withAdminAuth } from '@/lib/api/admin-client';
import { IProductListPage, ICollection, ITag, productSort, productType,
  IProductSuggestionResponse, IAdminProductDetail, IAdminProductListResponse, productStatus, IKujiPrize,
} from '@/interfaces/product';
import { IOrderDetail, IGuestTicketView, IAdminOrderListResponse } from '@/interfaces/order';
import { ICheckoutSuccess } from '@/interfaces/checkout';
import { IAdminCustomerListResponse } from '@/interfaces/customer';
import { IFaqListResponse, IAdminFaqItem, IAdminFaqListResponse, IAdminLegalListResponse } from '@/interfaces/legal';

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
  fetchProducts: async ({
    pageParam = undefined,
    collection,
    tag,
    type,
    sort,
  }: {
    pageParam?: string | unknown;
    collection?: string;
    tag?: string;
    type?: productType;
    sort?: productSort;
  }): Promise<AxiosResponse<IBaseApiResponse<IProductListPage>>> => {
    return httpClient.get('/api/v1/products', {
      params: {
        cursor: pageParam ?? '',
        collection,
        tag,
        type,
        sort,
      },
    });
  },
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
  fetchGuestTickets: (id: string): Promise<AxiosResponse<IBaseApiResponse<IGuestTicketView>>> => {
    return httpClient.get(`/api/v1/orders/${id}/tickets`);
  },
  fetchAdminProducts: async (status?: productStatus): Promise<AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>> => {
    return httpClient.get('/api/v1/admin/products', await withAdminAuth({
      params: status ? { status } : undefined,
    }));
  },
  fetchAdminProduct: async (id: string): Promise<AxiosResponse<IBaseApiResponse<IAdminProductDetail>>> => {
    return httpClient.get(`/api/v1/admin/products/${id}`, await withAdminAuth());
  },
  fetchAdminOrders: async (): Promise<AxiosResponse<IBaseApiResponse<IAdminOrderListResponse>>> => {
    return httpClient.get('/api/v1/admin/orders', await withAdminAuth());
  },
  fetchAdminOrder: async (adminOrderId: string): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.get(`/api/v1/admin/orders/${adminOrderId}`, await withAdminAuth());
  },
  fetchAdminCustomers: async (): Promise<AxiosResponse<IBaseApiResponse<IAdminCustomerListResponse>>> => {
    return httpClient.get('/api/v1/admin/customers', await withAdminAuth());
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
};

export default QueryConfigs;
