import {
  type ICartItem,
  type ICartLineIdentity,
  type ICartSummary,
  type ICartTotals,
} from '@/interfaces/cart';
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_CURRENCY,
} from '@/utils/shipping';

// TEMP: Tax disabled (not collecting tax yet)
// const ESTIMATED_GST_RATE = 0.05;

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
  const hasPhysicalItems = totals.totalItems > 0;
  const qualifiesForFreeShipping = totals.totalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const amountUntilFreeShippingCents = Math.max(FREE_SHIPPING_THRESHOLD_CENTS - totals.totalCents, 0);
  const shippingCents =
    totals.totalCents === 0 || qualifiesForFreeShipping
      ? 0
      : FLAT_SHIPPING_CENTS;
  // TEMP: Tax disabled (not collecting tax yet)
  // const estimatedTaxCents = Math.round((totals.totalCents + shippingCents) * ESTIMATED_GST_RATE);
  const estimatedTaxCents = 0;
  const currency = items[0]?.product.currency ?? SHIPPING_CURRENCY;

  return {
    amountUntilFreeShippingCents,
    currency,
    estimatedTaxCents,
    hasPhysicalItems,
    isEstimated: true,
    shippingCents,
    subtotalCents: totals.totalCents,
    // TEMP: Tax disabled (not collecting tax yet)
    // totalCents: totals.totalCents + shippingCents + estimatedTaxCents,
    totalCents: totals.totalCents + shippingCents,
    totalItems: totals.totalItems,
  };
}
