import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrdersPageClient from '@/components/admin/orders/admin-orders-page';
import type { IAdminOrderListResponse } from '@/interfaces/order';
import { renderWithProviders } from '../test-utils';

const replace = vi.fn();
const push = vi.fn();
const mockCustomizeQuery = vi.fn();
let currentSearchParams = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

vi.mock('@/hooks/use-customize-query', () => ({
  default: (config: unknown) => mockCustomizeQuery(config),
}));

const ordersResponse: IAdminOrderListResponse = {
  items: [
    {
      id: 'order-1',
      publicId: 'PBX-1001',
      status: 'pending_payment',
      totalCents: 1000,
      currency: 'CAD',
      placedAt: '2026-04-01T10:00:00.000Z',
      createdAt: '2026-04-01T10:00:00.000Z',
      customer: {
        id: 'customer-1',
        email: 'alex@example.com',
        firstName: 'Alex',
        lastName: 'Chen',
      },
    },
    {
      id: 'order-2',
      publicId: 'PBX-1002',
      status: 'paid',
      totalCents: 2000,
      currency: 'CAD',
      placedAt: '2026-04-02T10:00:00.000Z',
      createdAt: '2026-04-02T10:00:00.000Z',
      customer: {
        id: 'customer-2',
        email: 'jordan@example.com',
        firstName: 'Jordan',
        lastName: 'Lee',
      },
    },
  ],
  nextCursor: null,
};

describe('AdminOrdersPageClient', () => {
  beforeEach(() => {
    currentSearchParams = '';
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      currentSearchParams = url.split('?')[1] ?? '';
    });
    push.mockReset();
    mockCustomizeQuery.mockReset();
    mockCustomizeQuery.mockReturnValue({
      data: {
        data: {
          data: ordersResponse,
        },
      },
      isPending: false,
      isError: false,
    });
  });

  it('filters orders live from the already-fetched dataset and syncs q into the URL', async () => {
    renderWithProviders(<AdminOrdersPageClient />);

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search orders' }),
      'jordan',
    );

    expect(screen.queryByText('PBX-1001')).not.toBeInTheDocument();
    expect(screen.getByText('PBX-1002')).toBeInTheDocument();

    await waitFor(() => {
      expect(replace).toHaveBeenLastCalledWith('/admin/orders?q=jordan', { scroll: false });
    });
  });

  it('applies the status tab from URL state and shows the matching empty state when search removes all rows', async () => {
    currentSearchParams = 'status=paid';
    const view = renderWithProviders(<AdminOrdersPageClient />);

    expect(screen.queryByText('PBX-1001')).not.toBeInTheDocument();
    expect(screen.getByText('PBX-1002')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paid \(1\)/i })).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search orders' }),
      'alex',
    );

    expect(screen.getByText('No orders match this view.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    view.rerender(<AdminOrdersPageClient />);

    expect(screen.getByRole('button', { name: /All \(2\)/i })).toBeInTheDocument();
  });
});
