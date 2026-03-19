import { IOrderDetail } from './order';

export interface IAddress {
  fullName: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string | null;
  phone: string | null;
}

export interface ICheckoutItem {
  productId: string;
  quantity: number;
}

export interface ICheckoutRequest {
  items: ICheckoutItem[];
}

export interface ICheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  publicId: string;
  orderId: string;
}

export interface ICheckoutSuccess {
  publicId: string;
  orderUrl: string;
  clientOrderUrl: string;
  needsAttention: boolean;
  order: IOrderDetail;
}
