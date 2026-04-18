import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCustomersPageClient from '@/components/admin/customers/admin-customers-page';
import type { IAdminCustomerListResponse } from '@/interfaces/customer';
import { renderWithProviders } from '../test-utils';

const replace = vi.fn();
const mockCustomizeQuery = vi.fn();
let currentSearchParams = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

vi.mock('@/hooks/use-customize-query', () => ({
  default: (config: unknown) => mockCustomizeQuery(config),
}));

const customersResponse: IAdminCustomerListResponse = {
  items: [
    {
      id: 'customer-1',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Chen',
      phone: '111-111-1111',
      orderCount: 2,
      totalSpentCents: 4000,
      createdAt: '2026-04-01T10:00:00.000Z',
    },
    {
      id: 'customer-2',
      email: 'jordan@example.com',
      firstName: 'Jordan',
      lastName: 'Lee',
      phone: '222-222-2222',
      orderCount: 1,
      totalSpentCents: 2000,
      createdAt: '2026-04-02T10:00:00.000Z',
    },
  ],
};

describe('AdminCustomersPageClient', () => {
  beforeEach(() => {
    currentSearchParams = '';
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      currentSearchParams = url.split('?')[1] ?? '';
    });
    mockCustomizeQuery.mockReset();
    mockCustomizeQuery.mockReturnValue({
      data: {
        data: {
          data: customersResponse,
        },
      },
      isPending: false,
      isError: false,
    });
  });

  it('filters customers live by name or email and updates q in the URL', async () => {
    renderWithProviders(<AdminCustomersPageClient />);

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search customers' }),
      'alex',
    );

    expect(screen.getAllByText('Alex Chen').length).toBeGreaterThan(0);
    expect(screen.queryByText('Jordan Lee')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(replace).toHaveBeenLastCalledWith('/admin/customers?q=alex', { scroll: false });
    });
  });

  it('shows a clearable empty state when no customers match', async () => {
    renderWithProviders(<AdminCustomersPageClient />);

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search customers' }),
      'nobody',
    );

    expect(screen.getByText('No customers match this search.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Clear search$/i }));

    expect(screen.getAllByText('Alex Chen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jordan Lee').length).toBeGreaterThan(0);
  });

  it('renders the mobile card list for customer browsing', () => {
    renderWithProviders(<AdminCustomersPageClient />);

    expect(screen.getByTestId('admin-customers-mobile-list')).toBeInTheDocument();
    expect(screen.getAllByText('Alex Chen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jordan Lee').length).toBeGreaterThan(0);
  });
});
