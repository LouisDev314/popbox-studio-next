import { describe, expect, it } from 'vitest';
import { buildCartSummary } from '@/utils/cart';
import { createCartItem } from '../fixtures';

describe('buildCartSummary', () => {
  it('returns merchandise-only totals without client shipping calculations', () => {
    const summary = buildCartSummary([
      createCartItem({ product: { priceCents: 14899 } }),
    ]);

    expect(summary).toEqual({
      currency: 'CAD',
      subtotalCents: 14899,
      totalItems: 1,
    });
    expect(summary).not.toHaveProperty('shippingCents');
    expect(summary).not.toHaveProperty('totalCents');
    expect(summary).not.toHaveProperty('amountUntilFreeShippingCents');
  });

  it('returns an empty merchandise summary for an empty cart', () => {
    const summary = buildCartSummary([]);

    expect(summary).toEqual({
      currency: 'CAD',
      subtotalCents: 0,
      totalItems: 0,
    });
  });
});
