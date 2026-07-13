import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IOrderDetail } from '@/interfaces/order';
import {
  centsToCad,
  initializeGoogleAnalytics,
  mapProductToGaItem,
  resetAnalyticsStateForTests,
  trackPurchaseOnce,
  trackSearch,
  trackViewItemList,
} from '@/lib/analytics';
import { createProductCard } from '@/tests/fixtures';

function createOrder(overrides: Partial<IOrderDetail> = {}): IOrderDetail {
  return {
    id: 'internal-order-id',
    publicId: 'PBX-ANALYTICS-1',
    status: 'paid',
    attention: null,
    currency: 'CAD',
    subtotalCents: 10000,
    taxCents: 500,
    shippingCents: 1200,
    totalCents: 11700,
    placedAt: '2026-07-12T12:00:00.000Z',
    paidAt: '2026-07-12T12:01:00.000Z',
    cancelledAt: null,
    refundedAt: null,
    shippingAddress: { postalCode: 'T1A 1A1' },
    billingAddress: null,
    customer: {
      id: 'customer-id',
      email: 'private@example.com',
      firstName: 'Private',
      lastName: 'Customer',
      phone: '555-555-5555',
    },
    shipment: null,
    tickets: [],
    items: [
      {
        id: 'internal-order-item-id',
        productId: 'product-1',
        productName: 'Kuji Ticket',
        productType: 'kuji',
        unitPriceCents: 5000,
        quantity: 2,
        lineTotalCents: 10000,
        metadata: { unrevealedPrize: 'Secret A Prize' },
        imageUrl: null,
        imageAltText: null,
      },
    ],
    ...overrides,
  };
}

function getEventCalls() {
  return vi.mocked(window.gtag!).mock.calls.filter(([command]) => command === 'event');
}

describe('GA4 analytics helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__popboxGaInitialized;
    window.__popboxGaReady = true;
    window.dataLayer = [];
    window.gtag = vi.fn();
    resetAnalyticsStateForTests();
  });

  it('converts valid cents to exact CAD decimal values and rejects malformed values', () => {
    expect(centsToCad(4999)).toBe(49.99);
    expect(centsToCad(0)).toBe(0);
    expect(centsToCad(-1)).toBeNull();
    expect(centsToCad(Number.NaN)).toBeNull();
  });

  it('maps standard and Kuji products without fabricating private prize data', () => {
    const standardItem = mapProductToGaItem(createProductCard(), 2);
    const kujiItem = mapProductToGaItem(createProductCard({
      id: 'kuji-1',
      productType: 'kuji',
      name: 'Kuji Tickets',
    }), 3);

    expect(standardItem).toMatchObject({
      item_category: 'Standard Product',
      price: 49.99,
      quantity: 2,
      currency: 'CAD',
    });
    expect(standardItem).not.toHaveProperty('item_variant');
    expect(kujiItem).toMatchObject({
      item_category: 'Ichiban Kuji',
      item_variant: 'Ticket',
      quantity: 3,
    });
    expect(JSON.stringify(kujiItem)).not.toContain('prize');
  });

  it('builds one ordered product-list event rather than one event per card', () => {
    const products = [
      createProductCard({ id: 'product-1', name: 'First' }),
      createProductCard({ id: 'product-2', name: 'Second' }),
    ];

    expect(trackViewItemList(products, { id: 'catalog', name: 'Catalog' })).toBe(true);
    expect(getEventCalls()).toHaveLength(1);
    expect(getEventCalls()[0]?.[2]).toMatchObject({
      item_list_id: 'catalog',
      item_list_name: 'Catalog',
      items: [
        expect.objectContaining({ item_id: 'product-1', index: 0 }),
        expect.objectContaining({ item_id: 'product-2', index: 1 }),
      ],
    });
  });

  it('tracks committed safe searches and rejects likely PII or private tokens', () => {
    expect(trackSearch('  dragon   ball  ')).toBe(true);
    expect(trackSearch('customer@example.com')).toBe(false);
    expect(trackSearch('session abcdefghijklmnopqrstuvwxyz123456')).toBe(false);
    expect(getEventCalls()).toHaveLength(1);
    expect(getEventCalls()[0]?.[2]).toEqual({ search_term: 'dragon ball' });
  });

  it('queues configuration once with automatic page views and advertising signals disabled', () => {
    delete window.__popboxGaReady;
    delete window.gtag;

    initializeGoogleAnalytics('G-N3TZG44VCT', true);
    initializeGoogleAnalytics('G-N3TZG44VCT', true);

    expect(window.dataLayer).toHaveLength(2);
    expect(Object.prototype.toString.call(window.dataLayer?.[0])).toBe('[object Arguments]');
    expect(Array.from((window.dataLayer?.[1] ?? []) as ArrayLike<unknown>)).toEqual([
      'config',
      'G-N3TZG44VCT',
      expect.objectContaining({
        allow_ad_personalization_signals: false,
        allow_google_signals: false,
        debug_mode: true,
        send_page_view: false,
      }),
    ]);
  });

  it('does not record pending, incomplete, or paid-needs-attention orders as purchases', () => {
    expect(trackPurchaseOnce(createOrder({ paidAt: null, status: 'pending_payment' }))).toBe(false);
    expect(trackPurchaseOnce(createOrder({ status: 'paid_needs_attention' }))).toBe(false);
    expect(getEventCalls()).toHaveLength(0);
  });

  it('records a finalized paid purchase exactly once across rerenders and refresh storage', () => {
    const order = createOrder();

    expect(trackPurchaseOnce(order)).toBe(true);
    expect(trackPurchaseOnce(order)).toBe(false);
    resetAnalyticsStateForTests();
    expect(trackPurchaseOnce(order)).toBe(false);

    expect(getEventCalls()).toHaveLength(1);
    expect(getEventCalls()[0]?.[2]).toEqual({
      transaction_id: 'PBX-ANALYTICS-1',
      currency: 'CAD',
      value: 117,
      tax: 5,
      shipping: 12,
      items: [
        {
          item_id: 'product-1',
          item_name: 'Kuji Ticket',
          item_category: 'Ichiban Kuji',
          item_variant: 'Ticket',
          price: 50,
          quantity: 2,
          currency: 'CAD',
        },
      ],
    });

    const serializedPayload = JSON.stringify(getEventCalls()[0]);
    expect(serializedPayload).not.toContain('private@example.com');
    expect(serializedPayload).not.toContain('T1A 1A1');
    expect(serializedPayload).not.toContain('internal-order-id');
    expect(serializedPayload).not.toContain('Secret A Prize');
  });

  it('never lets analytics failures break the commerce flow', () => {
    window.gtag = vi.fn(() => {
      throw new Error('analytics unavailable');
    });

    expect(() => trackPurchaseOnce(createOrder())).not.toThrow();
    expect(trackPurchaseOnce(createOrder())).toBe(false);
  });
});
