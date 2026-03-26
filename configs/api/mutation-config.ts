import httpClient from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { IOrderTicket, IGuestTicketView, IAdminOrderStatusUpdate, IAdminOrderShipmentUpdate, IAdminOrderRefundRequest, IOrderDetail } from '@/interfaces/order';
import {
  IAdminProduct,
  IAdminProductImagePatch,
  IAdminProductImageUploadResponse,
  IAdminProductStatusUpdate,
  IAdminProductCreate,
  IAdminProductUpdate,
  IAdminProductInventoryUpdate,
  IKujiPrize,
  ICollection,
  ITag,
} from '@/interfaces/product';
import { IAdminLegalCreate, IAdminLegalUpdate, IAdminLegalDocument } from '@/interfaces/legal';
import { withAdminAuth } from '@/lib/api/admin-client';
import { IContactRequestBody } from '@/interfaces/contact';

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
  revealAllTickets: (publicId: string): Promise<AxiosResponse<IBaseApiResponse<IGuestTicketView>>> => {
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
  createAdminProductKujiPrize: async ({ productId, data }: { productId: string; data: Partial<IKujiPrize> }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.post(`/api/v1/admin/products/${productId}/kuji-prizes`, data, await withAdminAuth());
  },
  updateAdminProductKujiPrize: async ({ productId, prizeId, data }: { productId: string; prizeId: string; data: Partial<IKujiPrize> }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/kuji-prizes/${prizeId}`, data, await withAdminAuth());
  },
  deleteAdminProductKujiPrize: async ({ productId, prizeId }: { productId: string; prizeId: string }): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.delete(`/api/v1/admin/products/${productId}/kuji-prizes/${prizeId}`, await withAdminAuth());
  },
  createAdminCollection: async (data: Partial<ICollection>): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.post('/api/v1/admin/collections', data, await withAdminAuth());
  },
  updateAdminCollection: async ({ id, data }: { id: string; data: Partial<ICollection> }): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.patch(`/api/v1/admin/collections/${id}`, data, await withAdminAuth());
  },
  createAdminTag: async (data: Partial<ITag>): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.post('/api/v1/admin/tags', data, await withAdminAuth());
  },
  updateAdminTag: async ({ id, data }: { id: string; data: Partial<ITag> }): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.patch(`/api/v1/admin/tags/${id}`, data, await withAdminAuth());
  },
  updateAdminOrderStatus: async ({ orderId, data }: { orderId: string; data: IAdminOrderStatusUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${orderId}/status`, data, await withAdminAuth());
  },
  updateAdminOrderShipment: async ({ orderId, data }: { orderId: string; data: IAdminOrderShipmentUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${orderId}/shipment`, data, await withAdminAuth());
  },
  resendAdminOrderConfirmation: async (orderId: string): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.post(`/api/v1/admin/orders/${orderId}/resend-confirmation`, undefined, await withAdminAuth());
  },
  refundAdminOrder: async ({ orderId, data }: { orderId: string; data: IAdminOrderRefundRequest }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.post(`/api/v1/admin/orders/${orderId}/refund`, data, await withAdminAuth());
  },
  reconcileAdminOrderRefund: async (orderId: string): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.post(`/api/v1/admin/orders/${orderId}/refund/reconcile`, undefined, await withAdminAuth());
  },
  createAdminLegalDoc: async (data: IAdminLegalCreate): Promise<AxiosResponse<IBaseApiResponse<IAdminLegalDocument>>> => {
    return httpClient.post('/api/v1/admin/legal', data, await withAdminAuth());
  },
  updateAdminLegalDoc: async ({ id, data }: { id: string; data: IAdminLegalUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminLegalDocument>>> => {
    return httpClient.patch(`/api/v1/admin/legal/${id}`, data, await withAdminAuth());
  },
  sendContactEmail: async (
    data: IContactRequestBody,
  ): Promise<AxiosResponse<IBaseApiResponse<null>>> => {
    return httpClient.post('/api/v1/contact', data);
  },
};

export default MutationConfigs;
