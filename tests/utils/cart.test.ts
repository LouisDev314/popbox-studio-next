import { describe, expect, it } from 'vitest';
import { buildCartSummary } from '@/utils/cart';
import { createCartItem } from '../fixtures';

describe('buildCartSummary', () => {
  it('charges flat shipping one cent below the free shipping threshold', () => {
    const summary = buildCartSummary([
      createCartItem({ product: { priceCents: 14899 } }),
    ]);

    expect(summary.shippingCents).toBe(1599);
    expect(summary.amountUntilFreeShippingCents).toBe(1);
  });

  it('uses free shipping at the threshold', () => {
    const summary = buildCartSummary([
      createCartItem({ product: { priceCents: 14900 } }),
    ]);

    expect(summary.shippingCents).toBe(0);
    expect(summary.amountUntilFreeShippingCents).toBe(0);
  });

  it('uses free shipping above the threshold', () => {
    const summary = buildCartSummary([
      createCartItem({ product: { priceCents: 15000 } }),
    ]);

    expect(summary.shippingCents).toBe(0);
    expect(summary.amountUntilFreeShippingCents).toBe(0);
  });

  it('does not show shipping cost for an empty cart', () => {
    const summary = buildCartSummary([]);

    expect(summary.shippingCents).toBe(0);
    expect(summary.amountUntilFreeShippingCents).toBe(14900);
    expect(summary.subtotalCents).toBe(0);
  });
});

