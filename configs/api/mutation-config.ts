import httpClient from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { IOrderTicket, IGuestTicketView, IAdminOrderStatusUpdate, IAdminOrderShipmentUpdate, IAdminOrderRefundRequest, IOrderDetail } from '@/interfaces/order';
import {
  IAdminProduct,
  IAdminProductImagePatch,
  IAdminProductImageUploadResponse,
  IAdminCollectionCreateRequest,
  IAdminCollectionUpdateRequest,
  IAdminKujiPrizeCreateRequest,
  IAdminKujiPrizeUpdateRequest,
  IAdminProductStatusUpdate,
  IAdminProductCreate,
  IAdminProductUpdate,
  IAdminProductInventoryUpdate,
  IKujiPrize,
  ICollection,
  ITag,
  IAdminTagCreateRequest,
  IAdminTagUpdateRequest,
} from '@/interfaces/product';
import {
  IAdminFaqCreate,
  IAdminFaqItem,
  IAdminFaqUpdate,
  IAdminLegalCreate,
  IAdminLegalUpdate,
  IAdminLegalDocument,
} from '@/interfaces/legal';
import { withAdminAuth } from '@/lib/api/admin-client';
import { IContactRequestBody } from '@/interfaces/contact';
import { IShippingSettings, IUpdateShippingSettingsPayload } from '@/interfaces/shipping';

const MutationConfigs = {
  createCheckoutSession: (
    data: ICheckoutRequest, 
    idempotencyKey: string,
  ): Promise<AxiosResponse<IBaseApiResponse<ICheckoutSession>>> => {
    return httpClient.post('/api/v1/checkout/session', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  },
  revealTicket: ({
    publicId,
    ticketId,
  }: {
    publicId: string;
    ticketId: string;
  }): Promise<AxiosResponse<IBaseApiResponse<IOrderTicket>>> => {
    return httpClient.post(`/api/v1/orders/${publicId}/tickets/${ticketId}/reveal`);
  },
  revealAllTickets: async (publicId: string): Promise<AxiosResponse<IBaseApiResponse<IGuestTicketView>>> => {
    return httpClient.post(`/api/v1/orders/${publicId}/tickets/reveal-all`);
  },
  patchAdminProductStatus: async ({
    productId,
    status,
  }: {
    productId: string;
    status: IAdminProductStatusUpdate['status'];
  }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}`, { status }, await withAdminAuth());
  },
  createAdminProduct: async (data: IAdminProductCreate): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.post('/api/v1/admin/products', data, await withAdminAuth());
  },
  updateAdminProduct: async ({ productId, data }: { productId: string; data: IAdminProductUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}`, data, await withAdminAuth());
  },
  updateAdminProductInventory: async ({ productId, data }: { productId: string; data: IAdminProductInventoryUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/inventory`, data, await withAdminAuth());
  },
  uploadAdminProductImage: async ({ productId, formData }: { productId: string; formData: FormData }): Promise<AxiosResponse<IBaseApiResponse<IAdminProductImageUploadResponse>>> => {
    return httpClient.post(`/api/v1/admin/products/${productId}/images`, formData, await withAdminAuth());
  },
  reorderAdminProductImages: async ({ productId, imageIds }: { productId: string; imageIds: string[] }): Promise<AxiosResponse<IBaseApiResponse<IAdminProductImagePatch[]>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/images/reorder`, { imageIds }, await withAdminAuth());
  },
  deleteAdminProductImage: async ({ productId, imageId }: { productId: string; imageId: string }): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.delete(`/api/v1/admin/products/${productId}/images/${imageId}`, await withAdminAuth());
  },
  createAdminProductKujiPrize: async ({ productId, data }: { productId: string; data: IAdminKujiPrizeCreateRequest }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.post(`/api/v1/admin/products/${productId}/kuji-prizes`, data, await withAdminAuth());
  },
  updateAdminProductKujiPrize: async ({ productId, prizeId, data }: { productId: string; prizeId: string; data: IAdminKujiPrizeUpdateRequest }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/kuji-prizes/${prizeId}`, data, await withAdminAuth());
  },
  deleteAdminProductKujiPrize: async ({ productId, prizeId }: { productId: string; prizeId: string }): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.delete(`/api/v1/admin/products/${productId}/kuji-prizes/${prizeId}`, await withAdminAuth());
  },
  createAdminCollection: async (data: IAdminCollectionCreateRequest): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.post('/api/v1/admin/collections', data, await withAdminAuth());
  },
  updateAdminCollection: async ({ id, data }: { id: string; data: IAdminCollectionUpdateRequest }): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.patch(`/api/v1/admin/collections/${id}`, data, await withAdminAuth());
  },
  createAdminTag: async (data: IAdminTagCreateRequest): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.post('/api/v1/admin/tags', data, await withAdminAuth());
  },
  updateAdminTag: async ({ id, data }: { id: string; data: IAdminTagUpdateRequest }): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.patch(`/api/v1/admin/tags/${id}`, data, await withAdminAuth());
  },
  updateAdminOrderStatus: async ({ adminOrderId, data }: { adminOrderId: string; data: IAdminOrderStatusUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${adminOrderId}/status`, data, await withAdminAuth());
  },
  updateAdminOrderShipment: async ({ adminOrderId, data }: { adminOrderId: string; data: IAdminOrderShipmentUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${adminOrderId}/shipment`, data, await withAdminAuth());
  },
  resendAdminOrderConfirmation: async (adminOrderId: string): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.post(`/api/v1/admin/orders/${adminOrderId}/resend-confirmation`, undefined, await withAdminAuth());
  },
  refundAdminOrder: async ({ adminOrderId, data }: { adminOrderId: string; data: IAdminOrderRefundRequest }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.post(`/api/v1/admin/orders/${adminOrderId}/refund`, data, await withAdminAuth());
  },
  createAdminLegalDoc: async (data: IAdminLegalCreate): Promise<AxiosResponse<IBaseApiResponse<IAdminLegalDocument>>> => {
    return httpClient.post('/api/v1/admin/legal', data, await withAdminAuth());
  },
  updateAdminLegalDoc: async ({ id, data }: { id: string; data: IAdminLegalUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminLegalDocument>>> => {
    return httpClient.patch(`/api/v1/admin/legal/${id}`, data, await withAdminAuth());
  },
  createAdminFaqItem: async (data: IAdminFaqCreate): Promise<AxiosResponse<IBaseApiResponse<IAdminFaqItem>>> => {
    return httpClient.post('/api/v1/admin/legal/faq', data, await withAdminAuth());
  },
  updateAdminFaqItem: async ({ id, data }: { id: string; data: IAdminFaqUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminFaqItem>>> => {
    return httpClient.patch(`/api/v1/admin/legal/faq/${id}`, data, await withAdminAuth());
  },
  updateAdminShippingSettings: async (
    data: IUpdateShippingSettingsPayload,
  ): Promise<AxiosResponse<IBaseApiResponse<IShippingSettings>>> => {
    return httpClient.put('/api/v1/admin/settings/shipping', data, await withAdminAuth());
  },
  sendContactEmail: async (
    data: IContactRequestBody,
  ): Promise<AxiosResponse<IBaseApiResponse<null>>> => {
    return httpClient.post('/api/v1/contact', data);
  },
};

export default MutationConfigs;
