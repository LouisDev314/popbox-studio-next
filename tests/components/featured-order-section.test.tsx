import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedOrderSection } from '@/components/admin/collections/featured-order-section';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IAdminFeaturedOrderItem, IAdminFeaturedOrderResponse } from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';

const toastSuccessMock = vi.hoisted(() => vi.fn());
const dndHarness = vi.hoisted(() => ({
  dragEnd: null as ((event: { active: { id: string }; over: { id: string } | null }) => void) | null,
  dragStart: null as ((event: { active: { id: string } }) => void) | null,
  dragStartCalls: 0,
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
      onDragStart,
    }: React.PropsWithChildren<{
      onDragEnd?: typeof dndHarness.dragEnd;
      onDragStart?: typeof dndHarness.dragStart;
    }>) => {
      dndHarness.dragEnd = onDragEnd ?? null;
      dndHarness.dragStart = onDragStart
        ? (event) => {
          dndHarness.dragStartCalls += 1;
          onDragStart(event);
        }
        : null;
      return children;
    },
    DragOverlay: ({ children }: React.PropsWithChildren) => children,
    useSensor: () => ({}),
    useSensors: () => [],
  };
});

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable');
  return {
    ...actual,
    SortableContext: ({ children }: React.PropsWithChildren) => children,
    useSortable: () => ({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

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
    ...overrides,
  };

  return { ...renderWithProviders(<FeaturedOrderSection {...props} />), props };
}

function dragProduct(activeId: string, overId: string) {
  act(() => {
    dndHarness.dragStart?.({ active: { id: activeId } });
    dndHarness.dragEnd?.({ active: { id: activeId }, over: { id: overId } });
  });
}

describe('FeaturedOrderSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toastSuccessMock.mockReset();
    dndHarness.dragStartCalls = 0;
  });

  it('renders dedicated accessible drag handles without visible ranks or move controls', async () => {
    renderSection();

    const list = await screen.findByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('First Product');
    expect(rows[0]).not.toHaveTextContent(/^\s*1\s/);
    expect(within(list).queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* (up|down)/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(3);
    const firstHandle = screen.getByRole('button', { name: 'Reorder First Product' });
    firstHandle.focus();
    expect(firstHandle).toHaveFocus();
    expect(firstHandle).toHaveClass('focus-visible:ring-2');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
  });

  it('drags locally and saves product IDs in visual order without duplicate submission', async () => {
    let resolveSave: ((value: AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>) => void) | undefined;
    const savePromise = new Promise<AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>>((resolve) => {
      resolveSave = resolve;
    });
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockReturnValue(savePromise);
    renderSection();

    await screen.findByRole('list');
    dragProduct('product-3', 'product-1');
    expect(updateOrder).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Final Product');
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

    await screen.findByRole('list');
    dragProduct('product-2', 'product-1');
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

    await screen.findByRole('list');
    dragProduct('product-3', 'product-2');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    expect(await screen.findByText(/membership changed while you were editing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reload Featured products' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Final Product')).toBeInTheDocument();
    expect(screen.queryByText('Second Product')).not.toBeInTheDocument();
  });

  it('preserves a failed draft and allows retry', async () => {
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(response([items[1], items[0], items[2]]));
    const { unmount } = renderSection();

    await screen.findByRole('list');
    dragProduct('product-2', 'product-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('Unable to save Featured order. Please try again.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Second Product');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled());

    unmount();
    renderSection({ items: [] });
    expect(await screen.findByText('No Featured products yet.')).toBeInTheDocument();
  });

  it('removes locally, keeps dragging separate, and discard restores the product', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder');
    renderSection();
    await screen.findByRole('list');

    const dragStartsBeforeRemove = dndHarness.dragStartCalls;
    await userEvent.click(screen.getByRole('button', { name: 'Remove Second Product from Featured' }));

    expect(screen.queryByText('Second Product')).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(updateOrder).not.toHaveBeenCalled();
    expect(dndHarness.dragStartCalls).toBe(dragStartsBeforeRemove);

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByText('Second Product')).toBeInTheDocument();
  });

  it('saves the remaining IDs after a local removal', async () => {
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockResolvedValue(
      response([items[0], items[2]]),
    );
    renderSection();

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Second Product from Featured' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    expect(updateOrder.mock.calls[0]?.[0]).toEqual({ productIds: ['product-1', 'product-3'] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled());
  });

  it('applies the same local order change produced by keyboard sorting', async () => {
    renderSection();
    const handle = await screen.findByRole('button', { name: 'Reorder Second Product' });
    handle.focus();

    dragProduct('product-2', 'product-1');

    expect(handle).toHaveFocus();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Second Product');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeEnabled();
  });

  it('renders an initial load error with a retry action', async () => {
    renderSection({ isError: true, items: [] });

    expect(await screen.findByText('Unable to load Featured products. Please refresh and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add products' })).toBeDisabled();
  });
});
