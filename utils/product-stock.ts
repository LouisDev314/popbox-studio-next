import { type IKujiPrize, type IProductCard } from '@/interfaces/product';

type TProductStockLike = Pick<IProductCard, 'inventory' | 'productType'> & {
  kujiPrizes?: IKujiPrize[];
};

export type InventoryStatus = 'sold_out' | 'low_stock' | 'in_stock';

interface IProductInventoryState {
  availableStock: number;
  hasInventoryData: boolean;
  isKuji: boolean;
  status: InventoryStatus;
}

export const MAX_IN_CART_MESSAGE = 'You already have the maximum available quantity in your cart.';

function normalizePrizeCode(prizeCode: string): string {
  return prizeCode.trim().toUpperCase();
}

export function isKujiProduct(product: Pick<IProductCard, 'productType'>): boolean {
  return product.productType === 'kuji';
}

export function getAvailableStock(product: Pick<IProductCard, 'inventory'>): number {
  if (!product.inventory) {
    return 0;
  }

  return Math.max(0, product.inventory.onHand - product.inventory.reserved);
}

export function getProductInventoryState(product: Pick<IProductCard, 'inventory' | 'productType'>): IProductInventoryState {
  const isKuji = isKujiProduct(product);

  if (!product.inventory) {
    return {
      availableStock: 0,
      hasInventoryData: false,
      isKuji,
      status: 'in_stock',
    };
  }

  const availableStock = getAvailableStock(product);
  const lowStockThreshold = Math.max(0, product.inventory.lowStockThreshold);
  const status = availableStock <= 0
    ? 'sold_out'
    : lowStockThreshold > 0 && availableStock <= lowStockThreshold
      ? 'low_stock'
      : 'in_stock';

  return {
    availableStock,
    hasInventoryData: true,
    isKuji,
    status,
  };
}

export function getProductInventoryStatusLabel(product: Pick<IProductCard, 'inventory' | 'productType'>): string | null {
  const inventoryState = getProductInventoryState(product);

  if (!inventoryState.hasInventoryData) {
    return null;
  }

  if (inventoryState.status === 'sold_out') {
    return 'Sold Out';
  }

  if (inventoryState.isKuji) {
    const ticketLabel = `${inventoryState.availableStock} ticket${inventoryState.availableStock === 1 ? '' : 's'} left`;
    return inventoryState.status === 'low_stock' ? `${ticketLabel}` : ticketLabel;
  }

  return inventoryState.status === 'low_stock' ? 'Low in Stock' : 'Stock Available';
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

  return getAvailableStock(product);
}

export function getProductSellableQuantity(product: TProductStockLike): number {
  if (isKujiProduct(product)) {
    return getKujiSellableQuantity(product) ?? 0;
  }

  return getAvailableStock(product);
}

export function getRemainingQuantityMessage(product: Pick<IProductCard, 'productType'>, quantity: number): string {
  if (isKujiProduct(product)) {
    return `${quantity} ticket${quantity === 1 ? '' : 's'} left.`;
  }

  return `${quantity} left.`;
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
