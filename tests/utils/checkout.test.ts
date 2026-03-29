import { describe, expect, it } from 'vitest';
import { buildCheckoutRequest } from '@/utils/checkout';
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
});
