import httpClient from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { IOrderTicket, IGuestTicketView, IAdminOrderStatusUpdate, IAdminOrderShipmentUpdate, IAdminOrderRefundRequest, IOrderDetail } from '@/interfaces/order';
import { IAdminProduct, IAdminProductStatusUpdate, IAdminProductCreate, IAdminProductUpdate, IAdminProductInventoryUpdate, IProductImage, IKujiPrize, ICollection, ITag } from '@/interfaces/product';

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
  patchAdminProductStatus: ({
    productId,
    status,
  }: {
    productId: string;
    status: IAdminProductStatusUpdate['status'];
  }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}`, { status });
  },
  createAdminProduct: (data: IAdminProductCreate): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.post('/api/v1/admin/products', data);
  },
  updateAdminProduct: ({ productId, data }: { productId: string; data: IAdminProductUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}`, data);
  },
  updateAdminProductInventory: ({ productId, data }: { productId: string; data: IAdminProductInventoryUpdate }): Promise<AxiosResponse<IBaseApiResponse<IAdminProduct>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/inventory`, data);
  },
  uploadAdminProductImage: ({ productId, formData }: { productId: string; formData: FormData }): Promise<AxiosResponse<IBaseApiResponse<IProductImage>>> => {
    return httpClient.post(`/api/v1/admin/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  reorderAdminProductImages: ({ productId, imageIds }: { productId: string; imageIds: string[] }): Promise<AxiosResponse<IBaseApiResponse<IProductImage[]>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/images/reorder`, { imageIds });
  },
  deleteAdminProductImage: ({ productId, imageId }: { productId: string; imageId: string }): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.delete(`/api/v1/admin/products/${productId}/images/${imageId}`);
  },
  createAdminProductKujiPrize: ({ productId, data }: { productId: string; data: Partial<IKujiPrize> }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.post(`/api/v1/admin/products/${productId}/prizes`, data);
  },
  updateAdminProductKujiPrize: ({ productId, prizeId, data }: { productId: string; prizeId: string; data: Partial<IKujiPrize> }): Promise<AxiosResponse<IBaseApiResponse<IKujiPrize>>> => {
    return httpClient.patch(`/api/v1/admin/products/${productId}/prizes/${prizeId}`, data);
  },
  deleteAdminProductKujiPrize: ({ productId, prizeId }: { productId: string; prizeId: string }): Promise<AxiosResponse<IBaseApiResponse<void>>> => {
    return httpClient.delete(`/api/v1/admin/products/${productId}/prizes/${prizeId}`);
  },
  createAdminCollection: (data: Partial<ICollection>): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.post('/api/v1/admin/collections', data);
  },
  updateAdminCollection: ({ id, data }: { id: string; data: Partial<ICollection> }): Promise<AxiosResponse<IBaseApiResponse<ICollection>>> => {
    return httpClient.patch(`/api/v1/admin/collections/${id}`, data);
  },
  createAdminTag: (data: Partial<ITag>): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.post('/api/v1/admin/tags', data);
  },
  updateAdminTag: ({ id, data }: { id: string; data: Partial<ITag> }): Promise<AxiosResponse<IBaseApiResponse<ITag>>> => {
    return httpClient.patch(`/api/v1/admin/tags/${id}`, data);
  },
  updateAdminOrderStatus: ({ orderId, data }: { orderId: string; data: IAdminOrderStatusUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${orderId}/status`, data);
  },
  updateAdminOrderShipment: ({ orderId, data }: { orderId: string; data: IAdminOrderShipmentUpdate }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.patch(`/api/v1/admin/orders/${orderId}/shipment`, data);
  },
  refundAdminOrder: ({ orderId, data }: { orderId: string; data: IAdminOrderRefundRequest }): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.post(`/api/v1/admin/orders/${orderId}/refund`, data);
  },
  reconcileAdminOrderRefund: (orderId: string): Promise<AxiosResponse<IBaseApiResponse<IOrderDetail>>> => {
    return httpClient.post(`/api/v1/admin/orders/${orderId}/refund/reconcile`);
  },
};

export default MutationConfigs;
