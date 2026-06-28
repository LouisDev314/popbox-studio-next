import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuestOrderPage from '@/app/(store)/orders/[publicId]/page';
import { GET as guestAccessGet } from '@/app/(store)/orders/[publicId]/access/route';
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

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();

  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
    },
  };
});

describe('guest order pages', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(getPublicApiErrorStatus).mockReset();
    vi.mocked(getPublicGuestOrder).mockReset();
    vi.mocked(getPublicGuestTickets).mockReset();
  });

  it('redirects failed guest token handoffs to a clean url without leaking the token', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('upstream unavailable'));

    const response = await guestAccessGet(
      new NextRequest('http://localhost:3001/orders/pbs-ORDER/access?next=order&token=secret-token'),
      {
        params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      },
    );

    const location = response.headers.get('location');

    expect(location).toBe('http://localhost:3001/orders/pbs-ORDER?handoff=failed');
    expect(location).not.toContain('secret-token');
    expect(location).not.toContain('token=');
  });

  it('shows failed guest access guidance without a tokenized retry link', async () => {
    render(await GuestOrderPage({
      params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      searchParams: Promise.resolve({
        handoff: 'failed',
      }),
    }));

    expect(screen.getByText('Access Link Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact Support' })).toHaveAttribute('href', '/contact');
    expect(screen.queryByRole('link', { name: 'Try Again' })).not.toBeInTheDocument();
    expect(getPublicGuestOrder).not.toHaveBeenCalled();
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
      billingAddress: null,
      cancelledAt: null,
      customer: {
        email: 'popbox@example.com',
        firstName: 'Pop',
        id: 'customer-1',
        lastName: 'Box',
        phone: null,
      },
      currency: 'CAD',
      id: 'order-1',
      items: [
        {
          id: 'item-1',
          imageUrl: 'https://example.com/item.jpg',
          imageAltText: 'Ichiban Figure image',
          lineTotalCents: 4999,
          productName: 'Ichiban Figure',
          productId: 'product-1',
          productType: 'standard',
          quantity: 1,
          unitPriceCents: 4999,
          metadata: null,
        },
      ],
      paidAt: null,
      placedAt: '2026-01-01T00:00:00.000Z',
      publicId: 'pbs-ORDER',
      refundedAt: null,
      shipment: null,
      shippingAddress: {
        city: 'Toronto',
        fullName: 'Pop Box',
        line1: '123 Queen St',
        line2: '',
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
    expect(screen.getByRole('img', {
      name: 'Ichiban Figure image',
    })).toHaveAttribute('src', expect.stringContaining('item.jpg'));
    expect(screen.queryByText('Taxes')).not.toBeInTheDocument();
  });

  it('renders the initials fallback when a guest order item imageUrl is null', async () => {
    vi.mocked(getPublicGuestOrder).mockResolvedValue({
      billingAddress: null,
      cancelledAt: null,
      customer: {
        email: 'popbox@example.com',
        firstName: 'Pop',
        id: 'customer-1',
        lastName: 'Box',
        phone: null,
      },
      currency: 'CAD',
      id: 'order-1',
      items: [
        {
          id: 'item-1',
          imageUrl: null,
          imageAltText: null,
          lineTotalCents: 14994,
          productName: 'Digimon Adventure 25th Anniversary Ver. Blind Box',
          productId: 'product-1',
          productType: 'standard',
          quantity: 6,
          unitPriceCents: 2499,
          metadata: null,
        },
      ],
      paidAt: null,
      placedAt: '2026-01-01T00:00:00.000Z',
      publicId: 'pbs-ORDER',
      refundedAt: null,
      shipment: null,
      shippingAddress: {
        city: 'Toronto',
        fullName: 'Pop Box',
        line1: '123 Queen St',
        line2: '',
        postalCode: 'M5H 2N2',
        province: 'ON',
      },
      shippingCents: 0,
      status: 'paid',
      subtotalCents: 14994,
      taxCents: 0,
      tickets: [],
      totalCents: 14994,
    });

    render(await GuestOrderPage({
      params: Promise.resolve({ publicId: 'pbs-ORDER' }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByRole('img', {
      name: 'Digimon Adventure 25th Anniversary Ver. Blind Box',
    })).toHaveTextContent('DA');
    expect(screen.getByText('$24.99 each')).toBeInTheDocument();
    expect(screen.getByText('Line total')).toBeInTheDocument();
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
