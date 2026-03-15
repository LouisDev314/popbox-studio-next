import { type IProductCard } from '@/interfaces/product';

export interface ICartItem {
  id: string;
  product: IProductCard;
  quantity: number;
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
