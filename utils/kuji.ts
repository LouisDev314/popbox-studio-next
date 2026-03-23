import { type IKujiPrize, type IProductCard } from '@/interfaces/product';

type TKujiProductLike = Pick<IProductCard, 'inventory' | 'productType'> & {
  kujiPrizes?: IKujiPrize[];
};

function normalizePrizeCode(prizeCode: string): string {
  return prizeCode.trim().toUpperCase();
}

export function isKujiProduct(product: Pick<IProductCard, 'productType'>): boolean {
  return product.productType === 'kuji';
}

export function isLastOnePrize(prizeCode: string): boolean {
  return normalizePrizeCode(prizeCode) === 'LO';
}

export function getKujiSellableQuantity(product: TKujiProductLike): number | null {
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

export function getKujiCartLimitMessage(quantity: number, sellableQuantity: number | null): string | null {
  if (sellableQuantity === null || quantity < sellableQuantity) {
    return null;
  }

  if (sellableQuantity <= 0) {
    return 'This kuji is sold out.';
  }

  return 'You already have the maximum available quantity in your cart.';
}
