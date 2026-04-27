import { describe, expect, it } from 'vitest';
import {
  buildCheckoutRequest,
  getPurchasedProductIdsFromOrder,
  getValidatedCheckoutUrl,
} from '@/utils/checkout';
import type { IOrderDetail } from '@/interfaces/order';
import {
  createCartItem,
  createCartProduct,
  VALID_PRODUCT_ID,
} from '../fixtures';

function createCheckoutOrderWithProductIds(productIds: string[]): IOrderDetail {
  return {
    billingAddress: null,
    cancelledAt: null,
    currency: 'CAD',
    customer: {
      email: 'customer@example.com',
      firstName: null,
      id: 'customer-1',
      lastName: null,
      phone: null,
    },
    id: 'order-1',
    items: productIds.map((productId, index) => ({
      id: `order-item-${index}`,
      imageAltText: null,
      imageUrl: null,
      lineTotalCents: 4999,
      metadata: null,
      productId,
      productName: 'Ichiban Figure',
      productType: 'standard',
      quantity: 1,
      unitPriceCents: 4999,
    })),
    paidAt: '2026-01-01T00:00:00.000Z',
    placedAt: '2026-01-01T00:00:00.000Z',
    publicId: 'PBX-ORDER',
    refundedAt: null,
    shipment: null,
    shippingAddress: {},
    shippingCents: 0,
    status: 'paid',
    subtotalCents: 0,
    taxCents: 0,
    tickets: [],
    totalCents: 0,
  };
}

describe('buildCheckoutRequest', () => {
  it('builds the exact backend payload for valid cart items', () => {
    const result = buildCheckoutRequest([
      createCartItem({ quantity: 2 }),
    ]);

    expect(result).toEqual({
      data: {
        items: [
          {
            productId: VALID_PRODUCT_ID,
            quantity: 2,
          },
        ],
      },
      success: true,
    });
  });

  it('blocks the request when the product id is not a UUID', () => {
    const result = buildCheckoutRequest([
      createCartItem({
        product: createCartProduct({
          id: 'legacy-figure',
        }),
      }),
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain('invalid checkout data');
    }
  });

  it('accepts valid Stripe Checkout URLs only', () => {
    expect(getValidatedCheckoutUrl('https://checkout.stripe.com/pay/cs_test_123')).toBe(
      'https://checkout.stripe.com/pay/cs_test_123',
    );
    expect(getValidatedCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_456')).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_456',
    );
  });

  it('rejects invalid or non-https checkout URLs', () => {
    expect(() => getValidatedCheckoutUrl('http://checkout.stripe.com/pay/cs_test_123')).toThrow(
      'payment link was invalid',
    );
    expect(() => getValidatedCheckoutUrl('https://example.com/pay/cs_test_123')).toThrow(
      'payment link was invalid',
    );
    expect(() => getValidatedCheckoutUrl('not-a-url')).toThrow(
      'payment link was invalid',
    );
  });

  it('extracts unique purchased product ids from the order item contract', () => {
    const otherProductId = '22222222-2222-4222-8222-222222222222';
    const order = createCheckoutOrderWithProductIds([
      VALID_PRODUCT_ID,
      VALID_PRODUCT_ID,
      otherProductId,
    ]);

    expect(getPurchasedProductIdsFromOrder(order)).toEqual([VALID_PRODUCT_ID, otherProductId]);
  });
});
