import { describe, expect, it } from 'vitest';
import {
  buildCheckoutRequest,
  CANADIAN_PROVINCES,
  getPurchasedProductIdsFromOrder,
  getValidatedCheckoutUrl,
  isCanadianProvinceCode,
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
  it('builds the exact backend checkout contract for valid cart and customer details', () => {
    const result = buildCheckoutRequest([
      createCartItem({ quantity: 2 }),
    ], {
      email: ' customer@example.com ',
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      phone: ' +1 780 555 0100 ',
      shippingAddress: {
        fullName: ' Ada Lovelace ',
        line1: ' 123 Maple Street ',
        line2: '',
        city: ' Vancouver ',
        province: 'bc',
        postalCode: ' V6B 1A1 ',
        countryCode: 'ca',
        phone: '',
      },
    });

    expect(result).toEqual({
      data: {
        billingSameAsShipping: true,
        email: 'customer@example.com',
        firstName: 'Ada',
        items: [
          {
            productId: VALID_PRODUCT_ID,
            quantity: 2,
          },
        ],
        lastName: 'Lovelace',
        phone: '+1 780 555 0100',
        shippingAddress: {
          city: 'Vancouver',
          countryCode: 'CA',
          fullName: 'Ada Lovelace',
          line1: '123 Maple Street',
          line2: null,
          phone: null,
          postalCode: 'V6B 1A1',
          province: 'BC',
        },
      },
      success: true,
    });

    if (result.success) {
      expect(result.data).not.toHaveProperty('subtotalCents');
      expect(result.data).not.toHaveProperty('shippingCents');
      expect(result.data).not.toHaveProperty('taxCents');
      expect(result.data).not.toHaveProperty('totalCents');
      expect(result.data).not.toHaveProperty('taxBreakdown');
      expect(result.data).not.toHaveProperty('contact');
    }
  });

  it('blocks the request when the product id is not a UUID', () => {
    const result = buildCheckoutRequest([
      createCartItem({
        product: createCartProduct({
          id: 'legacy-figure',
        }),
      }),
    ], {
      email: 'customer@example.com',
      shippingAddress: {
        fullName: 'Ada Lovelace',
        line1: '123 Maple Street',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6B 1A1',
        countryCode: 'CA',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain('invalid checkout data');
    }
  });

  it('rejects invalid contact and Canadian shipping details before quoting', () => {
    const result = buildCheckoutRequest([
      createCartItem(),
    ], {
      email: 'not-an-email',
      shippingAddress: {
        fullName: '',
        line1: '',
        city: '',
        province: 'WA',
        postalCode: '',
        countryCode: 'US',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.join(' ')).toContain('Enter a valid email address.');
      expect(result.issues.join(' ')).toContain('Full name is required.');
      expect(result.issues.join(' ')).toContain('Street address is required.');
      expect(result.issues.join(' ')).toContain('City is required.');
      expect(result.issues.join(' ')).toContain('Choose a Canadian province or territory.');
      expect(result.issues.join(' ')).toContain('Country must be Canada.');
    }
  });

  it('exposes normalized Canadian province codes', () => {
    expect(CANADIAN_PROVINCES.map((province) => province.code)).toContain('BC');
    expect(isCanadianProvinceCode('BC')).toBe(true);
    expect(isCanadianProvinceCode('bc')).toBe(false);
    expect(isCanadianProvinceCode('WA')).toBe(false);
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
