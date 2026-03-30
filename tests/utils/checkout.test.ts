import { describe, expect, it } from 'vitest';
import { buildCheckoutRequest, getValidatedCheckoutUrl } from '@/utils/checkout';
import {
  createCartItem,
  createCartProduct,
  VALID_PRODUCT_ID,
} from '../fixtures';

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
});
