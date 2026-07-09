import { describe, expect, it } from 'vitest';
import {
  areShippingAddressesEquivalent,
  buildCheckoutRequest,
  CANADIAN_PROVINCES,
  getPurchasedProductIdsFromOrder,
  getValidatedCheckoutUrl,
  isCanadianProvinceCode,
  shouldConfirmSuggestedAddress,
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
    const customer = {
      email: ' customer@example.com ',
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      phone: ' +1 780 555 0100 ',
      customerNote: '  Please pack this away from heavy items.  ',
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
    };
    const result = buildCheckoutRequest([
      createCartItem({ quantity: 2 }),
    ], customer);

    expect(result).toEqual({
      data: {
        billingSameAsShipping: true,
        customerNote: 'Please pack this away from heavy items.',
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

  it('normalizes a whitespace-only customer note to null', () => {
    const customer = {
      email: 'customer@example.com',
      customerNote: '     ',
      shippingAddress: {
        fullName: 'Ada Lovelace',
        line1: '123 Maple Street',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6B 1A1',
        countryCode: 'CA',
      },
    };
    const result = buildCheckoutRequest([
      createCartItem(),
    ], customer);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerNote).toBeNull();
    }
  });

  it('rejects customer notes over 200 characters for checkout sessions', () => {
    const customer = {
      email: 'customer@example.com',
      customerNote: 'a'.repeat(201),
      shippingAddress: {
        fullName: 'Ada Lovelace',
        line1: '123 Maple Street',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6B 1A1',
        countryCode: 'CA',
      },
    };
    const result = buildCheckoutRequest([
      createCartItem(),
    ], customer);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.join(' ')).toContain('200');
    }
  });

  it('omits customer notes from quote payloads', () => {
    const result = buildCheckoutRequest([
      createCartItem(),
    ], {
      email: 'customer@example.com',
      customerNote: 'a'.repeat(201),
      shippingAddress: {
        fullName: 'Ada Lovelace',
        line1: '123 Maple Street',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6B 1A1',
        countryCode: 'CA',
      },
    }, {
      includeCustomerNote: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('customerNote');
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

  it('omits confirmedAddress unless a backend suggested address was accepted', () => {
    const result = buildCheckoutRequest([
      createCartItem(),
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

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('confirmedAddress');
    }
  });

  it('includes confirmedAddress only when explicitly requested', () => {
    const result = buildCheckoutRequest([
      createCartItem(),
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
    }, {
      confirmedAddress: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmedAddress).toBe(true);
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

describe('shouldConfirmSuggestedAddress', () => {
  it('treats normalized submitted and suggested addresses as equivalent', () => {
    expect(areShippingAddressesEquivalent({
      city: ' toronto ',
      countryCode: 'CA',
      fullName: 'Ada Lovelace',
      line1: ' 123 Queen St. W ',
      line2: '# 4',
      postalCode: 'm5h2m9',
      province: 'on',
    }, {
      city: 'Toronto',
      countryCode: 'CA',
      line1: '123 Queen St W',
      line2: '4',
      postalCode: 'M5H 2M9',
      province: 'ON',
    })).toBe(true);
  });

  it('does not require confirmation for casing whitespace and postal-code spacing differences', () => {
    expect(shouldConfirmSuggestedAddress({
      city: ' toronto ',
      countryCode: 'CA',
      fullName: 'Ada Lovelace',
      line1: ' 123   Queen St W ',
      line2: '',
      postalCode: 'm5h2m9',
      province: 'on',
    }, {
      city: 'Toronto',
      countryCode: 'CA',
      line1: '123 Queen St W',
      line2: null,
      postalCode: 'M5H 2M9',
      province: 'ON',
    })).toBe(false);
  });

  it('requires confirmation when the suggested address meaningfully differs', () => {
    expect(shouldConfirmSuggestedAddress({
      city: 'Toronto',
      countryCode: 'CA',
      fullName: 'Ada Lovelace',
      line1: '123 Queen St W',
      line2: '',
      postalCode: 'M5H 2M9',
      province: 'ON',
    }, {
      city: 'Toronto',
      countryCode: 'CA',
      line1: '125 Queen St W',
      line2: null,
      postalCode: 'M5H 2M9',
      province: 'ON',
    })).toBe(true);
  });

  it('ignores harmless punctuation when comparing address lines', () => {
    expect(shouldConfirmSuggestedAddress({
      city: 'Vancouver',
      countryCode: 'CA',
      fullName: 'Ada Lovelace',
      line1: '123 Maple St.',
      line2: '# 4',
      postalCode: 'V6B 1A1',
      province: 'BC',
    }, {
      city: 'Vancouver',
      countryCode: 'CA',
      line1: '123 Maple St',
      line2: '4',
      postalCode: 'V6B1A1',
      province: 'BC',
    })).toBe(false);
  });
});
