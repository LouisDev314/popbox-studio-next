import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutSuccessPage from '@/app/(store)/checkout/success/page';
import type { IOrderDetail } from '@/interfaces/order';
import { getPublicCheckoutSuccess } from '@/lib/api/public-storefront';

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicCheckoutSuccess: vi.fn(),
}));

vi.mock('@/app/(store)/checkout/success/checkout-success-effects', () => ({
  CheckoutSuccessChromeReady: () => null,
  CheckoutSuccessEffects: (props: { children: React.ReactNode }) => props.children,
  CheckoutSuccessFinalizing: (props: { message: string }) => <div>{props.message}</div>,
}));

function createOrder(overrides: Partial<IOrderDetail> = {}): IOrderDetail {
  return {
    attention: null,
    billingAddress: null,
    cancelledAt: null,
    currency: 'CAD',
    customer: {
      email: 'customer@example.com',
      firstName: 'Pop',
      id: 'customer-1',
      lastName: 'Box',
      phone: null,
    },
    id: 'order-1',
    items: [{
      id: 'item-1',
      imageAltText: null,
      imageUrl: null,
      lineTotalCents: 4999,
      metadata: null,
      productId: 'product-1',
      productName: 'Ichiban Figure',
      productType: 'standard',
      quantity: 1,
      unitPriceCents: 4999,
    }],
    paidAt: '2026-01-01T00:00:00.000Z',
    placedAt: '2026-01-01T00:00:00.000Z',
    publicId: 'pbs-ORDER',
    refundedAt: null,
    shipment: null,
    shippingAddress: {
      city: 'Toronto',
      countryCode: 'CA',
      fullName: 'Pop Box',
      line1: '123 Queen St',
      line2: '',
      postalCode: 'M5H 2N2',
      province: 'ON',
    },
    shippingCents: 0,
    status: 'paid',
    subtotalCents: 4999,
    taxCents: 0,
    tickets: [],
    totalCents: 4999,
    ...overrides,
  };
}

async function renderPage(searchParams: Record<string, string | string[] | undefined> = { session_id: 'cs_test_123' }) {
  return render(await CheckoutSuccessPage({
    searchParams: Promise.resolve(searchParams),
  }));
}

describe('CheckoutSuccessPage', () => {
  beforeEach(() => {
    vi.mocked(getPublicCheckoutSuccess).mockReset();
  });

  it('renders a standard order confirmation', async () => {
    vi.mocked(getPublicCheckoutSuccess).mockResolvedValue({
      pending: false,
      needsAttention: false,
      publicId: 'pbs-ORDER',
      order: createOrder(),
    });

    await renderPage();

    expect(screen.getByRole('heading', { name: 'Order Confirmed!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Order Details' })).toHaveAttribute('href', '/orders/pbs-ORDER');
  });

  it('links to ticket reveal for Kuji orders', async () => {
    vi.mocked(getPublicCheckoutSuccess).mockResolvedValue({
      pending: false,
      needsAttention: false,
      publicId: 'pbs-ORDER',
      order: createOrder({ tickets: [{
        id: 'ticket-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        kujiProduct: {
          id: 'kuji-1',
          imageAltText: null,
          imageUrl: null,
          name: 'Kuji Collection',
          slug: 'kuji-collection',
        },
        prize: null,
        revealedAt: null,
        ticketNumber: '1',
        voidedAt: null,
        voidReason: null,
      }] }),
    });

    await renderPage();

    expect(screen.getByRole('link', { name: 'Reveal My Tickets!' })).toHaveAttribute('href', '/orders/pbs-ORDER/tickets');
  });

  it('shows a finalizing state while the paid checkout is awaiting webhook finalization', async () => {
    vi.mocked(getPublicCheckoutSuccess).mockResolvedValue({
      pending: true,
      retryable: true,
      publicId: 'pbs-ORDER',
      status: 'pending_payment',
      message: 'Your payment was received. We are preparing your order details now.',
    });

    await renderPage();

    expect(screen.getByText('Your payment was received. We are preparing your order details now.')).toBeInTheDocument();
    expect(screen.queryByText('Order Details Unavailable')).not.toBeInTheDocument();
  });

  it('renders an invalid-session state without calling the success endpoint', async () => {
    await renderPage({});

    expect(screen.getByRole('heading', { name: 'Invalid Session' })).toBeInTheDocument();
    expect(getPublicCheckoutSuccess).not.toHaveBeenCalled();
  });

  it('renders recovery rather than throwing for an invalid completed payload without an order', async () => {
    vi.mocked(getPublicCheckoutSuccess).mockResolvedValue({
      pending: false,
      needsAttention: false,
      publicId: 'pbs-ORDER',
      order: undefined,
    } as unknown as Awaited<ReturnType<typeof getPublicCheckoutSuccess>>);

    await expect(renderPage()).resolves.not.toThrow();

    expect(screen.getByText('We received your payment, but could not load your order details.')).toBeInTheDocument();
  });

  it('renders payment recovery when the success request fails', async () => {
    vi.mocked(getPublicCheckoutSuccess).mockRejectedValue(new Error('upstream unavailable'));

    await renderPage();

    expect(screen.getByText('We received your payment, but could not load your order details.')).toBeInTheDocument();
  });

  it('does not call performance.measure while rendering recovery', async () => {
    const measure = vi.spyOn(performance, 'measure');
    vi.mocked(getPublicCheckoutSuccess).mockResolvedValue({
      pending: true,
      retryable: true,
      publicId: 'pbs-ORDER',
      status: 'pending_payment',
      message: 'Your payment was received. We are preparing your order details now.',
    });

    await renderPage();

    expect(measure).not.toHaveBeenCalled();
  });
});
