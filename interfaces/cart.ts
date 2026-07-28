import { type IKujiPrize, type IProductCard } from '@/interfaces/product';

export interface ICartProduct extends Omit<IProductCard, 'updatedAt'> {
  kujiPrizes?: IKujiPrize[];
}

export interface ICartVariantSnapshot {
  id: string;
  name: string;
  priceCents: number;
}

export interface ICartMigrationNotice {
  code: 'legacy_standard_variants_removed';
  removedCount: number;
}

export type CartIssueCode =
  | 'invalid_product_id'
  | 'missing_product_data'
  | 'invalid_quantity'
  | 'invalid_cart_item';

export interface ICartItem {
  id: string;
  product: ICartProduct;
  variant: ICartVariantSnapshot | null;
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
  migrationNotice: ICartMigrationNotice | null;
}

export interface ICartLineIdentity {
  productId: string;
  variantId: string | null;
}

export interface ICartTotals {
  totalCents: number;
  totalItems: number;
}

export interface ICartSummary {
  amountUntilFreeShippingCents: number;
  currency: string;
  estimatedTaxCents: number;
  hasPhysicalItems: boolean;
  isEstimated: boolean;
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
  totalItems: number;
}
