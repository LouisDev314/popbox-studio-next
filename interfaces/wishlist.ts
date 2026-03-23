import { type IProductCard } from '@/interfaces/product';

export interface IWishlistItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  productType: IProductCard['productType'];
}
