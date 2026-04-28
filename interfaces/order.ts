import { IKujiPrize } from './product';

export type IOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'cancelled'
  | 'refunded'
  | 'paid_needs_attention'
  | 'expired';

export interface IOrderCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface IOrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  metadata: Record<string, unknown> | null;
  imageUrl: string | null;
  imageAltText: string | null;
}

export interface IShipment {
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface IOrderTicket {
  id: string;
  ticketNumber: string;
  revealedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  prize: Pick<IKujiPrize, 'id' | 'name' | 'description' | 'imageUrl' | 'prizeCode' | 'prizeTier'> | null;
  kujiProduct: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    imageAltText: string | null;
  };
  createdAt: string;
}

export interface IOrderDetail {
  id: string;
  publicId: string;
  status: IOrderStatus;
  includesLastOnePrize?: boolean;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  placedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string> | null;
  customer: IOrderCustomer;
  shipment: IShipment | null;
  items: IOrderItem[];
  tickets: IOrderTicket[];
}

export type IGuestOrderDetail = IOrderDetail;

export interface IAdminOrderIdentity {
  id: string;
  publicId: string;
}

export interface IGuestTicketView {
  tickets: IOrderTicket[];
  revealed: IOrderTicket[];
  unrevealed: IOrderTicket[];
  counts: {
    total: number;
    revealed: number;
    unrevealed: number;
  };
}

interface IAdminOrderListCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface IAdminOrderListItem {
  id: string;
  publicId: string;
  status: IOrderStatus;
  includesLastOnePrize?: boolean;
  totalCents: number;
  currency: string;
  placedAt: string | null;
  createdAt: string;
  customer: IAdminOrderListCustomer;
}

export interface IAdminOrderListResponse {
  items: IAdminOrderListItem[];
  nextCursor: string | null;
}

export interface IAdminOrderStatusUpdate {
  status: IOrderStatus;
}

export interface IAdminOrderShipmentUpdate {
  carrierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface IAdminOrderRefundRequest {
  amountCents?: number;
  reason?: string | null;
}
