import { IOrderDetail } from './order';
import type { ShippingRegion } from './shipping';

export type UUID = string;

export type CanadianProvinceCode =
  | 'AB'
  | 'BC'
  | 'MB'
  | 'NB'
  | 'NL'
  | 'NS'
  | 'NT'
  | 'NU'
  | 'ON'
  | 'PE'
  | 'QC'
  | 'SK'
  | 'YT';

export interface CheckoutItem {
  productId: UUID;
  productVariantId?: UUID;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  province: CanadianProvinceCode;
  postalCode: string;
  countryCode: 'CA';
  phone?: string | null;
}

export type SuggestedShippingAddress = Pick<
  ShippingAddress,
  'city' | 'countryCode' | 'line1' | 'postalCode' | 'province'
> & {
  line2?: string | null;
};

export interface ContactFields {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface CheckoutRequestBody extends ContactFields {
  customerNote?: string | null;
  items: CheckoutItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress | null;
  billingSameAsShipping?: boolean;
  confirmedAddress?: boolean;
}

export type CheckoutQuoteRequest = CheckoutRequestBody;
export type CheckoutSessionRequest = CheckoutRequestBody;

export interface TaxBreakdown {
  countryCode: 'CA';
  provinceCode: CanadianProvinceCode;
  taxableAmountCents: number;
  gstRatePpm: number;
  pstRatePpm: number;
  hstRatePpm: number;
  qstRatePpm: number;
  gstCents: number;
  pstCents: number;
  hstCents: number;
  qstCents: number;
  totalTaxCents: number;
}

export interface CheckoutQuoteData {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  taxBreakdown: TaxBreakdown;
  shippingRegion?: ShippingRegion;
  appliedFreeShippingThresholdCents?: number;
}

export interface CheckoutSessionData {
  checkoutUrl: string;
  sessionId: string;
  publicId: string;
  orderId: string;
}

export type CheckoutValidationResult =
  | { data: CheckoutRequestBody; success: true }
  | { issues: string[]; message: string; success: false };

export interface CheckoutCustomerInput extends ContactFields {
  customerNote?: string | null;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phone?: string | null;
  };
}

export type ICheckoutItem = CheckoutItem;
export type ICheckoutRequest = CheckoutSessionRequest;
export type ICheckoutSession = CheckoutSessionData;

export interface ICheckoutSuccessPending {
  pending: true;
  retryable: true;
  publicId: string;
  status: IOrderDetail['status'];
  message: string;
}

export interface ICheckoutSuccessComplete {
  pending: false;
  publicId: string;
  needsAttention: boolean;
  order: IOrderDetail;
}

export type ICheckoutSuccess = ICheckoutSuccessPending | ICheckoutSuccessComplete;
