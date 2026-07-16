/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AccountProductIdentity } from '@/components/account/account-product-identity';
import { KujiHistory } from '@/components/account/kuji-history';
import { OrderDetail } from '@/components/account/order-detail';
import { OrdersList } from '@/components/account/orders-list';
import type {
  IAccountOrderListPage,
  ICustomerOrderDetail,
  IKujiHistoryPage,
} from '@/interfaces/account';
import {
  normalizeAccountKujiResultCollection,
  normalizeAccountOrderDetail,
} from '@/lib/account-order-normalizers';

vi.mock('next/image', () => ({
  default: forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }>(
    function MockNextImage({ alt, fill: _fill, ...props }, ref) {
      return <img ref={ref} {...props} alt={alt ?? ''} />;
    },
  ),
}));

vi.mock('@/configs/api/mutation-config', () => ({
  default: {
    revealAccountTicket: vi.fn(),
    revealAllAccountTickets: vi.fn(),
  },
}));

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

const baseOrder = {
  publicId: 'PBX-ACCOUNT-1',
  status: 'paid' as const,
  createdAt: '2026-07-14T12:00:00.000Z',
  placedAt: '2026-07-14T12:00:00.000Z',
  currency: 'CAD',
  subtotalCents: 5000,
  shippingCents: 0,
  taxCents: 250,
  taxBreakdown: {
    countryCode: 'CA' as const,
    provinceCode: 'AB' as const,
    taxableAmountCents: 5000,
    gstRatePpm: 50000,
    pstRatePpm: 0,
    hstRatePpm: 0,
    qstRatePpm: 0,
    gstCents: 250,
    pstCents: 0,
    hstCents: 0,
    qstCents: 0,
    totalTaxCents: 250,
  },
  discountCents: 0,
  totalCents: 5250,
  shipment: null,
};

describe('account product navigation', () => {
  it('links active products and renders archived products as historical snapshots', () => {
    const { rerender } = render(
      <AccountProductIdentity
        name="Active Kuji"
        productSlug="active-kuji"
        isStorefrontAccessible
        imageUrl={null}
        imageAltText={null}
      />,
    );

    expect(screen.getByRole('link', { name: /Active Kuji/ })).toHaveAttribute('href', '/products/active-kuji');

    rerender(
      <AccountProductIdentity
        name="Archived Kuji"
        productSlug="archived-kuji"
        isStorefrontAccessible={false}
        imageUrl={null}
        imageAltText={null}
      />,
    );

    expect(screen.queryByRole('link', { name: /Archived Kuji/ })).not.toBeInTheDocument();
    expect(screen.getByText('Archived Kuji')).toBeInTheDocument();
  });
});

describe('account orders list', () => {
  it('uses one semantic whole-row order link without nested product anchors', () => {
    const initialPage: IAccountOrderListPage = {
      items: [{
        ...baseOrder,
        products: [
          { productId: 'p1', productName: 'Active Figure', productType: 'standard', productSlug: 'active-figure', isStorefrontAccessible: true, quantity: 1, imageUrl: null, imageAltText: null },
          { productId: 'p2', productName: 'Archived Kuji', productType: 'kuji', productSlug: 'archived-kuji', isStorefrontAccessible: false, quantity: 2, imageUrl: null, imageAltText: null },
          { productId: 'p3', productName: 'Extra Product', productType: 'standard', productSlug: 'extra-product', isStorefrontAccessible: true, quantity: 1, imageUrl: null, imageAltText: null },
        ],
      }],
      nextCursor: null,
    };
    const { container } = renderWithQueryClient(<OrdersList initialPage={initialPage} />);

    const row = screen.getByTestId('order-row-PBX-ACCOUNT-1');
    expect(row.tagName).toBe('A');
    expect(row).toHaveAttribute('href', '/account/orders/PBX-ACCOUNT-1');
    expect(row).toHaveClass('cursor-pointer', 'focus-visible:ring-2');
    expect(screen.getByText('Active Figure').closest('a')).toBe(row);
    expect(screen.getByText('Archived Kuji')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    expect(container.querySelector('a a')).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(1);

    row.focus();
    expect(row).toHaveFocus();
  });

  it('preserves the empty state', () => {
    renderWithQueryClient(<OrdersList initialPage={{ items: [], nextCursor: null }} />);
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });
});

describe('account order detail', () => {
  it('renders mixed products prize-first without leaking unrevealed prize data', async () => {
    const user = userEvent.setup();
    const order: ICustomerOrderDetail = {
      ...baseOrder,
      includesLastOnePrize: false,
      customerNote: null,
      paidAt: '2026-07-14T12:01:00.000Z',
      cancelledAt: null,
      refundedAt: null,
      shippingAddress: { line1: '1 Main Street', city: 'Edmonton', province: 'AB', postalCode: 'T5J 0N3', countryCode: 'CA' },
      billingAddress: null,
      customer: { email: 'customer@example.com', firstName: 'Ada', lastName: 'Lovelace', phone: null },
      items: [
        {
          productId: 'standard-1', productName: 'Standard Figure', productType: 'standard', productSlug: 'standard-figure', isStorefrontAccessible: true,
          unitPriceCents: 2000, quantity: 1, lineTotalCents: 2000, imageUrl: null, imageAltText: null, kujiResults: [],
        },
        {
          productId: 'kuji-1', productName: 'Historical Kuji', productType: 'kuji', productSlug: 'historical-kuji', isStorefrontAccessible: false,
          unitPriceCents: 1500, quantity: 2, lineTotalCents: 3000, imageUrl: null, imageAltText: null,
          kujiResults: [
            { id: 'result-revealed', createdAt: baseOrder.createdAt, revealedAt: baseOrder.createdAt, voidedAt: null, voidReason: null, prize: { prizeCode: 'A', prizeTier: 'A', name: 'Hero Figure', description: 'Prize details', imageUrl: null } },
            { id: 'result-hidden', createdAt: baseOrder.createdAt, revealedAt: null, voidedAt: null, voidReason: null, prize: { prizeCode: 'S', prizeTier: 'S', name: 'Secret Prize', description: 'Secret details', imageUrl: null } },
          ],
        },
      ],
    };
    renderWithQueryClient(<OrderDetail order={order} />);

    expect(screen.getByText('Standard Figure')).toBeInTheDocument();
    expect(screen.getByText('Historical Kuji')).toBeInTheDocument();
    expect(screen.getByText('Hero Figure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal prize' })).toBeInTheDocument();
    expect(screen.queryByText('Secret Prize')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret details')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ticket/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Standard Figure/ })).toHaveAttribute('href', '/products/standard-figure');
    expect(screen.queryByRole('link', { name: /Historical Kuji/ })).not.toBeInTheDocument();

    const prizeButton = screen.getByRole('button', { name: /Hero Figure/ });
    prizeButton.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toHaveTextContent('Prize details');
  });

  it.each([
    ['standard-only order', [
      {
        productId: 'standard-1', productName: 'Standard Figure', productType: 'standard', productSlug: 'standard-figure', isStorefrontAccessible: true,
        unitPriceCents: 5000, quantity: 1, lineTotalCents: 5000, imageUrl: null, imageAltText: null, kujiResults: [],
      },
    ]],
    ['Kuji-only order', [
      {
        productId: 'kuji-1', productName: 'Kuji Set', productType: 'kuji', productSlug: 'kuji-set', isStorefrontAccessible: true,
        unitPriceCents: 5000, quantity: 1, lineTotalCents: 5000, imageUrl: null, imageAltText: null,
        kujiResults: [{ id: 'valid-result', createdAt: baseOrder.createdAt, revealedAt: null, voidedAt: null, voidReason: null, prize: null }],
      },
    ]],
    ['mixed order', [
      {
        productId: 'standard-1', productName: 'Standard Figure', productType: 'standard', productSlug: 'standard-figure', isStorefrontAccessible: true,
        unitPriceCents: 2000, quantity: 1, lineTotalCents: 2000, imageUrl: null, imageAltText: null, kujiResults: [],
      },
      {
        productId: 'kuji-1', productName: 'Kuji Set', productType: 'kuji', productSlug: 'kuji-set', isStorefrontAccessible: true,
        unitPriceCents: 3000, quantity: 1, lineTotalCents: 3000, imageUrl: null, imageAltText: null,
        kujiResults: [{ id: 'mixed-result', createdAt: baseOrder.createdAt, revealedAt: null, voidedAt: null, voidReason: null, prize: null }],
      },
    ]],
  ] as const)('opens a %s without a runtime error', (_label, items) => {
    const order = {
      ...baseOrder,
      includesLastOnePrize: false,
      customerNote: null,
      paidAt: baseOrder.createdAt,
      cancelledAt: null,
      refundedAt: null,
      shippingAddress: { line1: '1 Main Street', city: 'Edmonton', province: 'AB', postalCode: 'T5J 0N3', countryCode: 'CA' },
      billingAddress: null,
      customer: { email: 'customer@example.com', firstName: 'Ada', lastName: 'Lovelace', phone: null },
      items,
    } as unknown as ICustomerOrderDetail;

    expect(() => renderWithQueryClient(<OrderDetail order={order} />)).not.toThrow();
    expect(screen.getByRole('heading', { name: baseOrder.publicId })).toBeInTheDocument();
  });

  it('normalizes missing, empty, malformed, and transitional Kuji result payloads safely', () => {
    const rawOrder = {
      ...baseOrder,
      items: [
        { productId: 'missing', productType: 'kuji' },
        { productId: 'empty', productType: 'kuji', kujiResults: [] },
        {
          productId: 'malformed',
          productType: 'kuji',
          kujiResults: [
            null,
            undefined,
            { id: 'safe-result', createdAt: baseOrder.createdAt, revealedAt: null, prize: { prizeCode: 'S', prizeTier: 'S', name: 'Must stay hidden' } },
          ],
        },
        { productId: 'legacy-kuji', productType: 'kuji' },
      ],
      tickets: [
        null,
        {
          id: 'legacy-result',
          ticketNumber: 'INTERNAL-TICKET-NUMBER',
          createdAt: baseOrder.createdAt,
          revealedAt: null,
          voidedAt: null,
          voidReason: null,
          product: { productId: 'legacy-kuji' },
          prize: { prizeCode: 'A', prizeTier: 'A', name: 'Legacy hidden prize' },
        },
      ],
    };

    const normalized = normalizeAccountOrderDetail(rawOrder);

    expect(normalized.items[0]?.kujiResults).toEqual([]);
    expect(normalized.items[1]?.kujiResults).toEqual([]);
    expect(normalized.items[2]?.kujiResults).toEqual([
      expect.objectContaining({ id: 'safe-result', revealedAt: null, prize: null }),
    ]);
    expect(normalized.items[3]?.kujiResults).toEqual([
      expect.objectContaining({ id: 'legacy-result', revealedAt: null, prize: null }),
    ]);
    expect(normalized.items[3]?.kujiResults[0]).not.toHaveProperty('ticketNumber');
  });

  it('normalizes final and legacy reveal-all shapes without nullable result entries', () => {
    const finalShape = normalizeAccountKujiResultCollection({
      results: [undefined, null, { id: 'final-result', createdAt: baseOrder.createdAt, revealedAt: null }],
    });
    const legacyShape = normalizeAccountKujiResultCollection({
      tickets: [undefined, { id: 'legacy-result', createdAt: baseOrder.createdAt, revealedAt: null }],
    });

    expect(finalShape.results.map((result) => result.id)).toEqual(['final-result']);
    expect(legacyShape.results.map((result) => result.id)).toEqual(['legacy-result']);
  });
});

describe('Kuji History', () => {
  it('uses prize language, active product links, and the shared prize dialog', async () => {
    const user = userEvent.setup();
    const initialPage: IKujiHistoryPage = {
      items: [
        {
          id: 'history-revealed', createdAt: baseOrder.createdAt, revealedAt: baseOrder.createdAt, voidedAt: null, voidReason: null,
          order: { publicId: baseOrder.publicId, placedAt: baseOrder.placedAt },
          product: { productId: 'kuji-active', name: 'Active History Kuji', slug: 'active-history-kuji', isStorefrontAccessible: true, imageUrl: null, imageAltText: null },
          prize: { prizeCode: 'B', prizeTier: 'B', name: 'History Prize', description: 'History details', imageUrl: null },
        },
        {
          id: 'history-hidden', createdAt: baseOrder.createdAt, revealedAt: null, voidedAt: null, voidReason: null,
          order: { publicId: baseOrder.publicId, placedAt: baseOrder.placedAt },
          product: { productId: 'kuji-active', name: 'Active History Kuji', slug: 'active-history-kuji', isStorefrontAccessible: true, imageUrl: null, imageAltText: null },
          prize: { prizeCode: 'S', prizeTier: 'S', name: 'Hidden History Prize', description: 'Hidden history details', imageUrl: null },
        },
      ],
      nextCursor: null,
    };
    renderWithQueryClient(<KujiHistory initialPage={initialPage} />);

    expect(screen.getByRole('link', { name: /Active History Kuji/ })).toHaveAttribute('href', '/products/active-history-kuji');
    expect(screen.getByRole('link', { name: /Order PBX-ACCOUNT-1/ }).parentElement).toHaveTextContent('2 prizes');
    expect(screen.queryByText('Hidden History Prize')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ticket/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View order to reveal' })).toHaveAttribute('href', `/account/orders/${baseOrder.publicId}#kuji-prizes`);

    await user.click(screen.getByRole('button', { name: /History Prize/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('History details');
  });

  it('preserves the empty state', () => {
    renderWithQueryClient(<KujiHistory initialPage={{ items: [], nextCursor: null }} />);
    expect(screen.getByText('No Kuji history yet')).toBeInTheDocument();
  });
});
