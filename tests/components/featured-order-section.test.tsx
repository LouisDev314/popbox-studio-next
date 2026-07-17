import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedOrderSection } from '@/components/admin/collections/featured-order-section';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IAdminFeaturedOrderItem, IAdminFeaturedOrderResponse } from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';

const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: toastSuccessMock,
  },
}));

function item(id: string, name: string, sortOrder: number): IAdminFeaturedOrderItem {
  return {
    id,
    name,
    productType: id === 'product-2' ? 'kuji' : 'standard',
    status: id === 'product-3' ? 'draft' : 'active',
    sortOrder,
    collections: [{ id: 'featured', name: 'Featured', slug: 'featured' }],
    primaryImage: null,
  };
}

const items = [
  item('product-1', 'First Product', 0),
  item('product-2', 'Second Product', 1),
  item('product-3', 'Final Product', 2),
];

function response(nextItems: IAdminFeaturedOrderItem[]): AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>> {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data: { items: nextItems },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>;
}

function renderSection(overrides: Partial<React.ComponentProps<typeof FeaturedOrderSection>> = {}) {
  const props: React.ComponentProps<typeof FeaturedOrderSection> = {
    isError: false,
    isLoading: false,
    isMembershipMutationPending: false,
    items,
    onAddProductsClick: vi.fn(),
    onReload: vi.fn().mockResolvedValue(items),
    onRemoveProduct: vi.fn(),
    ...overrides,
  };

  return { ...renderWithProviders(<FeaturedOrderSection {...props} />), props };
}

describe('FeaturedOrderSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toastSuccessMock.mockReset();
  });

  it('renders the current order, visible positions, and disabled boundary controls', async () => {
    renderSection();

    const list = await screen.findByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/1.*First Product/);
    expect(rows[1]).toHaveTextContent(/2.*Second Product/);
    expect(rows[2]).toHaveTextContent(/3.*Final Product/);
    expect(screen.getByRole('button', { name: 'Move First Product up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Final Product down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
  });

  it('moves locally and saves product IDs in visual order without duplicate submission', async () => {
    let resolveSave: ((value: AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>) => void) | undefined;
    const savePromise = new Promise<AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>>((resolve) => {
      resolveSave = resolve;
    });
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockReturnValue(savePromise);
    renderSection();

    await userEvent.click(await screen.findByRole('button', { name: 'Move Final Product up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Final Product up' }));
    const saveButton = screen.getByRole('button', { name: 'Save order' });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await userEvent.dblClick(saveButton);

    expect(updateOrder).toHaveBeenCalledTimes(1);
    expect(updateOrder.mock.calls[0]?.[0]).toEqual({ productIds: ['product-3', 'product-1', 'product-2'] });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    resolveSave?.(response([items[2], items[0], items[1]]));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Featured product order saved.'));
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('confirms discard and restores the persisted order', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSection();

    await userEvent.click(await screen.findByRole('button', { name: 'Move Second Product up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(confirm).toHaveBeenCalledWith('Discard your unsaved Featured order changes?');
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('First Product');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
  });

  it('preserves the draft on membership conflict and offers reload', async () => {
    vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: 409,
          success: false,
          message: 'Conflict',
          data: null,
          errors: { code: 'FEATURED_MEMBERSHIP_CHANGED' },
        },
      },
    });
    const onReload = vi.fn().mockResolvedValue([items[0], items[2]]);
    renderSection({ onReload });

    await userEvent.click(await screen.findByRole('button', { name: 'Move Final Product up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    expect(await screen.findByText(/membership changed while you were editing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reload Featured products' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Final Product')).toBeInTheDocument();
    expect(screen.queryByText('Second Product')).not.toBeInTheDocument();
  });

  it('shows API errors and an empty state', async () => {
    vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockRejectedValue(new Error('network down'));
    const { unmount } = renderSection();

    await userEvent.click(await screen.findByRole('button', { name: 'Move Second Product up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('Unable to save Featured order. Please try again.')).toBeInTheDocument();

    unmount();
    renderSection({ items: [] });
    expect(await screen.findByText('No Featured products yet.')).toBeInTheDocument();
  });

  it('renders an initial load error with a retry action', async () => {
    renderSection({ isError: true, items: [] });

    expect(await screen.findByText('Unable to load Featured products. Please refresh and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add products' })).toBeDisabled();
  });
});
