import { type ICartItem, type ICartSummary, type ICartTotals } from '@/interfaces/cart';
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_CURRENCY,
} from '@/utils/shipping';

const ESTIMATED_GST_RATE = 0.05;

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
  const hasPhysicalItems = totals.totalItems > 0;
  const qualifiesForFreeShipping = totals.totalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const amountUntilFreeShippingCents = Math.max(FREE_SHIPPING_THRESHOLD_CENTS - totals.totalCents, 0);
  const shippingCents =
    totals.totalCents === 0 || qualifiesForFreeShipping
      ? 0
      : FLAT_SHIPPING_CENTS;
  const estimatedTaxCents = Math.round((totals.totalCents + shippingCents) * ESTIMATED_GST_RATE);
  const currency = items[0]?.product.currency ?? SHIPPING_CURRENCY;

  return {
    amountUntilFreeShippingCents,
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
