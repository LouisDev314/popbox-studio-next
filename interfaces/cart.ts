import { type IKujiPrize, type IProductCard } from '@/interfaces/product';

export interface ICartProduct extends IProductCard {
  kujiPrizes?: IKujiPrize[];
}

export type CartIssueCode =
  | 'invalid_product_id'
  | 'missing_product_data'
  | 'invalid_quantity'
  | 'invalid_cart_item';

export interface ICartItem {
  id: string;
  product: ICartProduct;
  quantity: number;
}

export interface ICartInvalidProductSnapshot {
  collectionName: string | null;
  imageUrl: string | null;
  name: string;
  priceCents: number | null;
  rawProductId: string | null;
  slug: string | null;
}

export interface ICartInvalidItem {
  id: string;
  issueCode: CartIssueCode;
  issueMessage: string;
  product: ICartInvalidProductSnapshot;
  quantity: number;
}

export interface ICartHydrationResult {
  invalidItems: ICartInvalidItem[];
  items: ICartItem[];
}

export interface ICartTotals {
  totalCents: number;
  totalItems: number;
}

export interface ICartSummary {
  currency: string;
  estimatedTaxCents: number;
  hasPhysicalItems: boolean;
  isEstimated: boolean;
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
  totalItems: number;
}
