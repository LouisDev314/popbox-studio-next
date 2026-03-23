import { type IKujiPrize, type IProductCard } from '@/interfaces/product';

type TProductStockLike = Pick<IProductCard, 'inventory' | 'productType'> & {
  kujiPrizes?: IKujiPrize[];
};

export const MAX_IN_CART_MESSAGE = 'You already have the maximum available quantity in your cart.';

function normalizePrizeCode(prizeCode: string): string {
  return prizeCode.trim().toUpperCase();
}

export function isKujiProduct(product: Pick<IProductCard, 'productType'>): boolean {
  return product.productType === 'kuji';
}

export function isLastOnePrize(prizeCode: string): boolean {
  return normalizePrizeCode(prizeCode) === 'LO';
}

export function getKujiSellableQuantity(product: TProductStockLike): number | null {
  if (!isKujiProduct(product)) {
    return null;
  }

  if (Array.isArray(product.kujiPrizes) && product.kujiPrizes.length > 0) {
    return product.kujiPrizes.reduce((total, prize) => {
      if (isLastOnePrize(prize.prizeCode)) {
        return total;
      }

      return total + Math.max(0, prize.remainingQuantity);
    }, 0);
  }

  return Math.max(0, product.inventory?.available ?? 0);
}

export function getProductSellableQuantity(product: TProductStockLike): number {
  if (isKujiProduct(product)) {
    return getKujiSellableQuantity(product) ?? 0;
  }

  return Math.max(0, product.inventory?.available ?? 0);
}

export function getRemainingQuantityMessage(product: Pick<IProductCard, 'productType'>, quantity: number): string {
  if (isKujiProduct(product)) {
    return `Only ${quantity} ticket${quantity === 1 ? '' : 's'} left.`;
  }

  return `Only ${quantity} left.`;
}

export function getProductSoldOutMessage(product: Pick<IProductCard, 'productType'>): string {
  if (isKujiProduct(product)) {
    return 'This kuji is sold out.';
  }

  return 'This product is sold out.';
}

export function getProductCartLimitMessage(product: TProductStockLike, quantity: number): string | null {
  const sellableQuantity = getProductSellableQuantity(product);

  if (quantity < sellableQuantity) {
    return null;
  }

  if (sellableQuantity <= 0) {
    return getProductSoldOutMessage(product);
  }

  if (quantity > sellableQuantity) {
    return getRemainingQuantityMessage(product, sellableQuantity);
  }

  return MAX_IN_CART_MESSAGE;
}
