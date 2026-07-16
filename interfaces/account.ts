import type { TaxBreakdown } from '@/interfaces/checkout';
import type { IOrderStatus, IShipment } from '@/interfaces/order';

export interface IAccountProfile {
  account: {
    id: string;
    email: string;
    emailVerified: true;
    createdAt: string;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface IAccountProfilePatch {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface IAccountOrderProduct {
  productId: string;
  productName: string;
  productType: 'standard' | 'kuji';
  productSlug: string | null;
  isStorefrontAccessible: boolean;
  quantity: number;
  imageUrl: string | null;
  imageAltText: string | null;
}

export interface IAccountOrderSummary {
  publicId: string;
  status: IOrderStatus;
  createdAt: string;
  placedAt: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  taxBreakdown: TaxBreakdown;
  discountCents: number;
  totalCents: number;
  products: IAccountOrderProduct[];
  shipment: IShipment | null;
}

export interface IAccountOrderListPage {
  items: IAccountOrderSummary[];
  nextCursor: string | null;
}

export interface ICustomerPrize {
  prizeCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  prizeTier: string;
}

export interface IAccountKujiResult {
  id: string;
  createdAt: string;
  revealedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  prize: ICustomerPrize | null;
}

export interface IAccountKujiResultCollection {
  results: IAccountKujiResult[];
}

export interface ICustomerOrderDetail {
  publicId: string;
  status: IOrderStatus;
  includesLastOnePrize: boolean;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  taxBreakdown: TaxBreakdown;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  customerNote: string | null;
  createdAt: string;
  placedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown> | null;
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  shipment: IShipment | null;
  items: Array<{
    productId: string;
    productName: string;
    productType: 'standard' | 'kuji';
    productSlug: string | null;
    isStorefrontAccessible: boolean;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    imageUrl: string | null;
    imageAltText: string | null;
    kujiResults: IAccountKujiResult[];
  }>;
}

export interface IKujiHistoryItem extends IAccountKujiResult {
  order: {
    publicId: string;
    placedAt: string | null;
  };
  product: {
    productId: string;
    name: string;
    slug: string;
    isStorefrontAccessible: boolean;
    imageUrl: string | null;
    imageAltText: string | null;
  };
}

export interface IKujiHistoryPage {
  items: IKujiHistoryItem[];
  nextCursor: string | null;
}
