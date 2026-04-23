import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuestOrderPage from '@/app/(store)/orders/[publicId]/page';
import OrderTicketsPage from '@/app/(store)/orders/[publicId]/tickets/page';
import {
  getPublicApiErrorStatus,
  getPublicGuestOrder,
  getPublicGuestTickets,
} from '@/lib/api/public-storefront';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    toString: (): string => '',
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicApiErrorStatus: vi.fn(),
  getPublicGuestOrder: vi.fn(),
  getPublicGuestTickets: vi.fn(),
}));

describe('guest order pages', () => {
  beforeEach(() => {
    vi.mocked(getPublicApiErrorStatus).mockReset();
    vi.mocked(getPublicGuestOrder).mockReset();
    vi.mocked(getPublicGuestTickets).mockReset();
  });

  it('keeps 404 guest order failures in the not found state', async () => {
    vi.mocked(getPublicGuestOrder).mockRejectedValue(new Error('not found'));
    vi.mocked(getPublicApiErrorStatus).mockReturnValue(404);

    render(await GuestOrderPage({
      params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByText('Order Not Found')).toBeInTheDocument();
    expect(screen.queryByText('Order Unavailable')).not.toBeInTheDocument();
  });

  it('shows a retry state when the guest order request fails transiently', async () => {
    vi.mocked(getPublicGuestOrder).mockRejectedValue(new Error('upstream failure'));
    vi.mocked(getPublicApiErrorStatus).mockReturnValue(503);

    render(await GuestOrderPage({
      params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByText('Order Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Again' })).toHaveAttribute('href', '/orders/pbs-ORDER');
  });

  it('shows FAQ and shipping links on the guest order detail page', async () => {
    vi.mocked(getPublicGuestOrder).mockResolvedValue({
      currency: 'CAD',
      items: [
        {
          id: 'item-1',
          imageUrl: 'https://example.com/item.jpg',
          lineTotalCents: 4999,
          productName: 'Ichiban Figure',
          quantity: 1,
        },
      ],
      placedAt: '2026-01-01T00:00:00.000Z',
      publicId: 'pbs-ORDER',
      shipment: null,
      shippingAddress: {
        city: 'Toronto',
        fullName: 'Pop Box',
        line1: '123 Queen St',
        line2: null,
        postalCode: 'M5H 2N2',
        province: 'ON',
      },
      shippingCents: 0,
      status: 'paid',
      subtotalCents: 4999,
      taxCents: 650,
      tickets: [],
      totalCents: 5649,
    });

    render(await GuestOrderPage({
      params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByRole('link', { name: 'View FAQ' })).toHaveAttribute('href', '/faq');
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
  });

  it('keeps 403/404 ticket failures in the not found state', async () => {
    vi.mocked(getPublicGuestTickets).mockRejectedValue(new Error('forbidden'));
    vi.mocked(getPublicApiErrorStatus).mockReturnValue(403);

    render(await OrderTicketsPage({
      params: Promise.resolve({ publicId: 'pbs-TICKETS' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByText('Tickets Not Found')).toBeInTheDocument();
    expect(screen.queryByText('Tickets Unavailable')).not.toBeInTheDocument();
  });

  it('shows a retry state when the tickets request fails transiently', async () => {
    vi.mocked(getPublicGuestTickets).mockRejectedValue(new Error('upstream failure'));
    vi.mocked(getPublicApiErrorStatus).mockReturnValue(502);

    render(await OrderTicketsPage({
      params: Promise.resolve({ publicId: 'pbs-TICKETS' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByText('Tickets Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Again' })).toHaveAttribute('href', '/orders/pbs-TICKETS/tickets');
  });
});
