import { IOrderDetail } from './order';

export interface IAddress {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phone: string | null;
}

export interface ICheckoutItem {
  productId: string;
  quantity: number;
}

export interface ICheckoutRequest {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  items: ICheckoutItem[];
  shippingAddress: IAddress;
  billingAddress: IAddress | null;
  billingSameAsShipping: boolean;
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
