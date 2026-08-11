import {
  type ICartItem,
  type ICartLineIdentity,
  type ICartSummary,
  type ICartTotals,
} from '@/interfaces/cart';

const DEFAULT_CART_CURRENCY = 'CAD';

export function getCartLineIdentity(item: ICartItem): ICartLineIdentity {
  return {
    productId: item.product.id,
    variantId: item.product.productType === 'standard' ? item.variant?.id ?? null : null,
  };
}

export function getCartLineKey(identity: ICartLineIdentity): string {
  return `${identity.productId}:${identity.variantId ?? ''}`;
}

export function getCartItemKey(item: ICartItem): string {
  return getCartLineKey(getCartLineIdentity(item));
}

export function getCartItemUnitPrice(item: ICartItem): number {
  return item.product.productType === 'standard'
    ? item.variant?.priceCents ?? item.product.priceCents
    : item.product.priceCents;
}

export function buildCartTotals(items: ICartItem[]): ICartTotals {
  return items.reduce<ICartTotals>(
    (accumulator, item) => {
      accumulator.totalItems += item.quantity;
      accumulator.totalCents += getCartItemUnitPrice(item) * item.quantity;
      return accumulator;
    },
    {
      totalCents: 0,
      totalItems: 0,
    },
  );
}

export function buildCartSummary(items: ICartItem[]): ICartSummary {
  const totals = buildCartTotals(items);
  const currency = items[0]?.product.currency ?? DEFAULT_CART_CURRENCY;

  return {
    currency,
    subtotalCents: totals.totalCents,
    totalItems: totals.totalItems,
  };
}
