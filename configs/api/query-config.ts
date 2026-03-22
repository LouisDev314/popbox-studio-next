import httpClient from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { IHomepageData } from '@/interfaces/home';
import { withAdminAuth } from '@/lib/api/admin-client';
import { IProduct, IProductListPage, ICollection, ITag, productSort, productType,
  IProductSuggestionResponse, IAdminProductDetail, IAdminProductListResponse, productStatus, IKujiPrize,
} from '@/interfaces/product';
import { IGuestOrderDetail, IGuestTicketView, IAdminOrderListResponse } from '@/interfaces/order';
import { ICheckoutSuccess } from '@/interfaces/checkout';
import { IAdminCustomerListResponse } from '@/interfaces/customer';

const QueryConfigs = {
  fetchHomePage: (): Promise<AxiosResponse<IBaseApiResponse<IHomepageData>>> => {
    return httpClient.get('/api/v1/home');
  },
  fetchCollections: (): Promise<AxiosResponse<IBaseApiResponse<ICollection[]>>> => {
    return httpClient.get('/api/v1/collections');
  },
  fetchTags: (): Promise<AxiosResponse<IBaseApiResponse<ITag[]>>> => {
    return httpClient.get('/api/v1/tags');
  },
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
  fetchProductBySlug: (slug: string): Promise<AxiosResponse<IBaseApiResponse<IProduct>>> => {
    return httpClient.get(`/api/v1/products/${slug}`);
  },
  fetchSearch: async ({
    query,
  }: {
    query: string;
  }): Promise<AxiosResponse<IBaseApiResponse<IProductListPage>>> => {
    return httpClient.get('/api/v1/search', {
      params: {
        q: query,
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
  fetchGuestOrderAccess: (publicId: string, token?: string): Promise<AxiosResponse<IBaseApiResponse<unknown>>> => {
    // Note: The /access endpoint returns a 302 redirect normally.
    // However, if called via fetch/axios, it may need special handling depending on CORS/redirect following.
    return httpClient.get(`/api/v1/orders/${publicId}/access`, {
      params: { token },
    });
  },
  fetchGuestOrder: (id: string): Promise<AxiosResponse<IBaseApiResponse<IGuestOrderDetail>>> => {
    return httpClient.get(`/api/v1/orders/${id}`);
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
  fetchAdminOrder: async (id: string): Promise<AxiosResponse<IBaseApiResponse<IGuestOrderDetail>>> => {
    return httpClient.get(`/api/v1/admin/orders/${id}`, await withAdminAuth());
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
    return httpClient.get(`/api/v1/admin/products/${productId}/prizes`, await withAdminAuth());
  },
};

export default QueryConfigs;
