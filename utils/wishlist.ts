import { type IProductCard } from '@/interfaces/product';
import { type IWishlistItem } from '@/interfaces/wishlist';

export const WISHLIST_STORAGE_KEY = 'popbox-wishlist-storage';

export function mapProductToWishlistItem(product: IProductCard): IWishlistItem {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: product.images[0]?.url ?? null,
    priceCents: product.priceCents,
    currency: product.currency,
    productType: product.productType,
  };
}
