import { type ICartItem, type ICartSummary, type ICartTotals } from '@/interfaces/cart';

const CART_DEFAULT_CURRENCY = 'CAD';
const ESTIMATED_GST_RATE = 0.05;
const STANDARD_SHIPPING_FEE_CENTS = 999;
const FREE_SHIPPING_THRESHOLD_CENTS = 10000;

export function buildCartTotals(items: ICartItem[]): ICartTotals {
  return items.reduce<ICartTotals>(
    (accumulator, item) => {
      accumulator.totalItems += item.quantity;
      accumulator.totalCents += item.product.priceCents * item.quantity;
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
  const hasPhysicalItems = items.some((item) => item.product.productType === 'standard');
  const qualifiesForFreeShipping = totals.totalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingCents =
    totals.totalCents === 0 || !hasPhysicalItems || qualifiesForFreeShipping
      ? 0
      : STANDARD_SHIPPING_FEE_CENTS;
  const estimatedTaxCents = Math.round((totals.totalCents + shippingCents) * ESTIMATED_GST_RATE);
  const currency = items[0]?.product.currency ?? CART_DEFAULT_CURRENCY;

  return {
    currency,
    estimatedTaxCents,
    hasPhysicalItems,
    isEstimated: true,
    shippingCents,
    subtotalCents: totals.totalCents,
    totalCents: totals.totalCents + shippingCents + estimatedTaxCents,
    totalItems: totals.totalItems,
  };
}
