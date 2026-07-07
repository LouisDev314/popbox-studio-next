import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrdersPageClient from '@/components/admin/orders/admin-orders-page';
import QueryConfigs from '@/configs/api/query-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IAdminOrderListItem, IAdminOrderListResponse } from '@/interfaces/order';
import { renderWithProviders } from '../test-utils';

const replace = vi.fn();
const push = vi.fn();
let currentSearchParams = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

function createResponse<T>(data: T): AxiosResponse<IBaseApiResponse<T>> {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse<IBaseApiResponse<T>>;
}

function createOrder(overrides: Partial<IAdminOrderListItem> = {}): IAdminOrderListItem {
  return {
    id: 'order-1',
    publicId: 'PBX-1001',
    status: 'pending_payment',
    attention: null,
    customerNote: null,
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
    ...overrides,
  };
}

function createOrdersResponse(
  items: IAdminOrderListItem[],
  nextCursor: string | null = null,
): IAdminOrderListResponse {
  return {
    items,
    nextCursor,
  };
}

describe('AdminOrdersPageClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentSearchParams = '';
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      currentSearchParams = url.split('?')[1] ?? '';
    });
    push.mockReset();
  });

  it('sends search, status, sort, cursor, and limit to the backend', async () => {
    currentSearchParams = 'search=jordan&status=paid&sort=total_desc';
    const fetchOrders = vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([createOrder({
        id: 'order-2',
        publicId: 'PBX-1002',
        status: 'paid',
      })])),
    );

    renderWithProviders(<AdminOrdersPageClient />);

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 25,
        search: 'jordan',
        sort: 'total_desc',
        status: 'paid',
      });
    });
  });

  it('search updates the URL and refetches the first page without local filtering', async () => {
    const fetchOrders = vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([
        createOrder(),
        createOrder({
          id: 'order-2',
          publicId: 'PBX-1002',
          status: 'paid',
          customer: {
            id: 'customer-2',
            email: 'jordan@example.com',
            firstName: 'Jordan',
            lastName: 'Lee',
          },
        }),
      ])),
    );
    let view = renderWithProviders(<AdminOrdersPageClient />);

    await screen.findAllByText('PBX-1001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search orders' }), 'jordan');
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/orders?search=jordan', { scroll: false });

    view.unmount();
    view = renderWithProviders(<AdminOrdersPageClient />);

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenLastCalledWith({
        cursor: undefined,
        limit: 25,
        search: 'jordan',
        sort: 'date_desc',
        status: 'all',
      });
    });
    expect((await screen.findAllByText('PBX-1001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('PBX-1002').length).toBeGreaterThan(0);
  });

  it('keeps clearing order search on empty submit', async () => {
    currentSearchParams = 'search=jordan';
    vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([createOrder()])),
    );

    renderWithProviders(<AdminOrdersPageClient />);

    const searchInput = screen.getByRole('searchbox', { name: 'Search orders' });

    await screen.findAllByText('PBX-1001');
    await userEvent.clear(searchInput);
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/orders', { scroll: false });
  });

  it('status and sort update URL state and reset pagination', async () => {
    const fetchOrders = vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([createOrder()], 'cursor-2')),
    );
    let view = renderWithProviders(<AdminOrdersPageClient />);

    await screen.findAllByText('PBX-1001');
    await userEvent.click(screen.getByRole('button', { name: 'Paid' }));

    expect(replace).toHaveBeenLastCalledWith('/admin/orders?status=paid', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminOrdersPageClient />);

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenLastCalledWith({
        cursor: undefined,
        limit: 25,
        search: undefined,
        sort: 'date_desc',
        status: 'paid',
      });
    });

    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'total_asc');

    expect(replace).toHaveBeenLastCalledWith('/admin/orders?status=paid&sort=total_asc', { scroll: false });
    view.unmount();
    renderWithProviders(<AdminOrdersPageClient />);

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenLastCalledWith({
        cursor: undefined,
        limit: 25,
        search: undefined,
        sort: 'total_asc',
        status: 'paid',
      });
    });
  });

  it('load more appends rows using nextCursor', async () => {
    const fetchOrders = vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockImplementation((filters) => (
      Promise.resolve(createResponse(createOrdersResponse(
        filters.cursor
          ? [createOrder({ id: 'order-2', publicId: 'PBX-1002', status: 'paid' })]
          : [createOrder()],
        filters.cursor ? null : 'cursor-2',
      )))
    ));

    renderWithProviders(<AdminOrdersPageClient />);

    expect(await screen.findAllByText('PBX-1001')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Load More' }));

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenLastCalledWith({
        cursor: 'cursor-2',
        limit: 25,
        search: undefined,
        sort: 'date_desc',
        status: 'all',
      });
    });
    expect(await screen.findAllByText('PBX-1002')).not.toHaveLength(0);
    expect(screen.getAllByText('PBX-1001')).not.toHaveLength(0);
  });

  it('does not render loaded-row status counts', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([
        createOrder(),
        createOrder({ id: 'order-2', publicId: 'PBX-1002', status: 'paid' }),
      ])),
    );

    renderWithProviders(<AdminOrdersPageClient />);

    await screen.findAllByText('PBX-1001');
    expect(screen.queryByText('(1)')).not.toBeInTheDocument();
    expect(screen.queryByText('(2)')).not.toBeInTheDocument();
  });

  it('renders backend attention messages for paid orders that need attention', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrders').mockResolvedValue(
      createResponse(createOrdersResponse([
        createOrder({
          status: 'paid_needs_attention',
          attention: {
            reasonCode: 'kuji_ticket_reveal_failed',
            message: 'Backend says ticket assignment needs review.',
            actionHint: 'Open the order and inspect the ticket draw.',
            createdAt: '2026-04-01T10:30:00.000Z',
          },
        }),
      ])),
    );

    renderWithProviders(<AdminOrdersPageClient />);

    expect(await screen.findAllByText('Backend says ticket assignment needs review.')).not.toHaveLength(0);
    expect(screen.getAllByText('Needs Attention')).not.toHaveLength(0);
  });
});
