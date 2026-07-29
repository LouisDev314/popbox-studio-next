import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedOrderSection } from '@/components/admin/collections/featured-order-section';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IAdminFeaturedOrderItem, IAdminFeaturedOrderResponse } from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';
import { buildAdminProductListKeyParams } from '@/lib/admin-product-filters';
import { adminCollectionKeys, adminProductKeys } from '@/lib/admin-query-keys';

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

const INITIAL_MEMBERSHIP_SIGNATURE = 'a'.repeat(64);

function featuredOrder(
  nextItems: IAdminFeaturedOrderItem[],
  membershipSignature = INITIAL_MEMBERSHIP_SIGNATURE,
): IAdminFeaturedOrderResponse {
  return { items: nextItems, membershipSignature };
}

function response(
  nextItems: IAdminFeaturedOrderItem[],
  membershipSignature = INITIAL_MEMBERSHIP_SIGNATURE,
): AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>> {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data: featuredOrder(nextItems, membershipSignature),
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>;
}

function renderSection(overrides: Partial<React.ComponentProps<typeof FeaturedOrderSection>> = {}) {
  const props: React.ComponentProps<typeof FeaturedOrderSection> = {
    featuredCollection: { id: 'featured', name: 'Featured', slug: 'featured' },
    featuredOrder: featuredOrder(items),
    isError: false,
    isLoading: false,
    localMembershipSignature: null,
    isMembershipMutationPending: false,
    onAddProductsClick: vi.fn(),
    onReload: vi.fn().mockResolvedValue(featuredOrder(items)),
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
    expect(updateOrder.mock.calls[0]?.[0]).toEqual({
      membershipSignature: INITIAL_MEMBERSHIP_SIGNATURE,
      productIds: ['product-3', 'product-1', 'product-2'],
    });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove First Product from Featured' })).toBeDisabled();

    resolveSave?.(response([items[2], items[0], items[1]]));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Featured product order saved.'));
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('saves safely when an opened product selector left an infinite cache behind', async () => {
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockResolvedValue(
      response([items[2], items[0], items[1]], 'b'.repeat(64)),
    );
    const { queryClient } = renderSection();
    const selectorKey = adminProductKeys.list(buildAdminProductListKeyParams({
      excludeCollectionId: 'featured',
    }));
    const pageParams = [undefined, 'cursor-2'];
    queryClient.setQueryData(selectorKey, {
      pages: [
        {
          items: [{ id: 'product-1', collections: items[0].collections }],
          nextCursor: 'cursor-2',
          totalCount: 2,
        },
        {
          items: [{ id: 'other-product', collections: [] }],
          nextCursor: null,
          totalCount: 2,
        },
      ],
      pageParams,
    });

    dragProduct('product-3', 'product-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Featured product order saved.'));
    expect(screen.queryByText(/membership changed while you were editing/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to save Featured order. Please try again.')).not.toBeInTheDocument();
    expect(queryClient.getQueryData<{ pageParams: unknown[] }>(selectorKey)?.pageParams).toBe(pageParams);
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
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder')
      .mockRejectedValueOnce({
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
      })
      .mockResolvedValueOnce(response([items[2], items[0]], 'b'.repeat(64)));
    const reloadedOrder = featuredOrder([items[0], items[2]], 'b'.repeat(64));
    const onReload = vi.fn().mockResolvedValue(reloadedOrder);
    renderSection({ onReload });

    await screen.findByRole('list');
    dragProduct('product-3', 'product-2');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    expect(await screen.findByText(/membership changed while you were editing/i)).toBeInTheDocument();
    expect(screen.queryByText('Unable to save Featured order. Please try again.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reload Featured products' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Final Product')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Second Product')).not.toBeInTheDocument());

    dragProduct('product-3', 'product-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(2));
    expect(updateOrder.mock.calls[1]?.[0]).toEqual({
      membershipSignature: 'b'.repeat(64),
      productIds: ['product-3', 'product-1'],
    });
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
    expect(screen.queryByText(/membership changed while you were editing/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload Featured products' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Second Product');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(2));
    expect(updateOrder.mock.calls.map(([payload]) => payload.membershipSignature)).toEqual([
      INITIAL_MEMBERSHIP_SIGNATURE,
      INITIAL_MEMBERSHIP_SIGNATURE,
    ]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled());

    unmount();
    renderSection({ featuredOrder: featuredOrder([]) });
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

    expect(updateOrder.mock.calls[0]?.[0]).toEqual({
      membershipSignature: INITIAL_MEMBERSHIP_SIGNATURE,
      productIds: ['product-1', 'product-3'],
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled());
  });

  it('adopts canonical metadata across consecutive reorders before removing without a reload', async () => {
    const reorderedSignature = 'b'.repeat(64);
    const removedSignature = 'c'.repeat(64);
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder')
      .mockResolvedValueOnce(response([items[2], items[0], items[1]], reorderedSignature))
      .mockResolvedValueOnce(response([items[0], items[2], items[1]], reorderedSignature))
      .mockResolvedValueOnce(response([items[0], items[2]], removedSignature));
    const { props, queryClient } = renderSection();

    await screen.findByRole('list');
    dragProduct('product-3', 'product-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());

    dragProduct('product-1', 'product-3');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
    expect(updateOrder.mock.calls[1]?.[0]).toEqual({
      membershipSignature: reorderedSignature,
      productIds: ['product-1', 'product-3', 'product-2'],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remove Second Product from Featured' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(3));

    expect(updateOrder.mock.calls[2]?.[0]).toEqual({
      membershipSignature: reorderedSignature,
      productIds: ['product-1', 'product-3'],
    });
    expect(props.onReload).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData<AxiosResponse<IBaseApiResponse<IAdminFeaturedOrderResponse>>>(
        adminCollectionKeys.featuredOrder(),
      )?.data.data.membershipSignature,
    ).toBe(removedSignature);
  });

  it('uses the post-removal signature for the next reorder', async () => {
    const removedSignature = 'c'.repeat(64);
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder')
      .mockResolvedValueOnce(response([items[0], items[2]], removedSignature))
      .mockResolvedValueOnce(response([items[2], items[0]], removedSignature));
    renderSection();

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Second Product from Featured' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());

    dragProduct('product-3', 'product-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalledTimes(2));
    expect(updateOrder.mock.calls[1]?.[0]).toEqual({
      membershipSignature: removedSignature,
      productIds: ['product-3', 'product-1'],
    });
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
    renderSection({ featuredOrder: null, isError: true });

    expect(await screen.findByText('Unable to load Featured products. Please refresh and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add products' })).toBeDisabled();
  });

  it('keeps recovery retryable when reload rejects without leaking the event promise', async () => {
    const onReload = vi.fn().mockRejectedValue(new Error('reload failed'));
    renderSection({ onReload });

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Second Product from Featured' }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reload Featured products' }));

    expect(await screen.findByText(/Unable to reload Featured products/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Featured products' })).toBeEnabled();
    expect(screen.queryByText('Unable to save Featured order. Please try again.')).not.toBeInTheDocument();
  });
});
