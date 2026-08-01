import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCollectionsPageClient from '@/components/admin/collections/admin-collections-page';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { ICollection } from '@/interfaces/product';
import { adminCollectionKeys } from '@/lib/admin-query-keys';
import { renderWithProviders } from '../test-utils';

type DragEndHandler = (event: {
  active: { id: string };
  over: { id: string } | null;
}) => void;

type DndAccessibility = {
  announcements?: {
    onDragStart?: (event: { active: { id: string } }) => string;
  };
  screenReaderInstructions?: {
    draggable?: string;
  };
};

const dndHarness = vi.hoisted(() => ({
  accessibility: [] as DndAccessibility[],
  dragEnds: [] as DragEndHandler[],
  sortableItems: [] as string[][],
}));
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      accessibility,
      children,
      onDragEnd,
    }: React.PropsWithChildren<{
      accessibility?: DndAccessibility;
      onDragEnd?: DragEndHandler;
    }>) => {
      if (accessibility) dndHarness.accessibility.push(accessibility);
      if (onDragEnd) dndHarness.dragEnds.push(onDragEnd);
      return children;
    },
    useSensor: () => ({}),
    useSensors: () => [],
  };
});

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable');
  return {
    ...actual,
    SortableContext: ({ children, items }: React.PropsWithChildren<{ items: string[] }>) => {
      dndHarness.sortableItems.push(items);
      return children;
    },
    useSortable: ({ id }: { id: string }) => ({
      attributes: { role: 'button', tabIndex: 0, 'data-sortable-id': id },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

function collection(id: string, name: string, sortOrder: number): ICollection {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    description: `${name} description`,
    sortOrder,
    isActive: true,
  };
}

const first = collection('collection-1', 'First Collection', 0);
const second = collection('collection-2', 'Second Collection', 1);
const third = collection('collection-3', 'Final Collection', 2);
const initialCollections = [third, first, second];
const canonicalCollections = [
  { ...third, sortOrder: 0 },
  { ...first, sortOrder: 1 },
  { ...second, sortOrder: 2 },
];

function response(items: ICollection[]): AxiosResponse<IBaseApiResponse<ICollection[]>> {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data: items,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse<IBaseApiResponse<ICollection[]>>;
}

function mockCollectionsQuery(...responses: ICollection[][]) {
  const fetchCollections = vi.spyOn(QueryConfigs, 'fetchAdminCollections');
  responses.forEach((items) => fetchCollections.mockResolvedValueOnce(response(items)));
  fetchCollections.mockResolvedValue(response(responses.at(-1) ?? []));
  return fetchCollections;
}

function renderedIds(testId: string) {
  const layout = screen.getByTestId(testId);
  return Array.from(layout.querySelectorAll<HTMLElement>('[data-collection-id]'))
    .map((element) => element.dataset.collectionId);
}

function latestDragEnd(layout: 'desktop' | 'mobile') {
  const handler = dndHarness.dragEnds.at(layout === 'mobile' ? -2 : -1);
  if (!handler) throw new Error(`Missing ${layout} drag handler`);
  return handler;
}

function dragCollection(layout: 'desktop' | 'mobile', activeId: string, overId: string) {
  act(() => {
    latestDragEnd(layout)({
      active: { id: `${layout}:${activeId}` },
      over: { id: `${layout}:${overId}` },
    });
  });
}

describe('AdminCollectionsPageClient', () => {
  beforeEach(() => {
    dndHarness.accessibility.length = 0;
    dndHarness.dragEnds.length = 0;
    dndHarness.sortableItems.length = 0;
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
  });

  it('renders persisted order with distinct responsive sortable IDs and accessible handles', async () => {
    mockCollectionsQuery(initialCollections);
    renderWithProviders(<AdminCollectionsPageClient />);

    await screen.findAllByText('First Collection');
    expect(renderedIds('admin-collections-mobile-list')).toEqual([
      'collection-1', 'collection-2', 'collection-3',
    ]);
    expect(renderedIds('admin-collections-desktop-table')).toEqual([
      'collection-1', 'collection-2', 'collection-3',
    ]);
    expect(dndHarness.sortableItems.slice(-2)).toEqual([
      ['mobile:collection-1', 'mobile:collection-2', 'mobile:collection-3'],
      ['desktop:collection-1', 'desktop:collection-2', 'desktop:collection-3'],
    ]);

    const handles = screen.getAllByRole('button', { name: 'Reorder First Collection' });
    expect(handles).toHaveLength(2);
    expect(handles.map((handle) => handle.getAttribute('data-sortable-id')).sort()).toEqual([
      'desktop:collection-1', 'mobile:collection-1',
    ]);
    handles[0]?.focus();
    expect(handles[0]).toHaveFocus();
    expect(handles[0]).toHaveClass('focus-visible:ring-2');
    expect(dndHarness.accessibility.at(-1)?.screenReaderInstructions?.draggable).toContain(
      'Use the arrow keys to move it',
    );
    expect(dndHarness.accessibility.at(-1)?.announcements?.onDragStart?.({
      active: { id: 'desktop:collection-1' },
    })).toBe('Picked up First Collection. Position 1 of 3.');
  });

  it.each(['desktop', 'mobile'] as const)(
    'maps a %s drag to raw IDs and keeps the canonical successful order',
    async (layout) => {
      mockCollectionsQuery(initialCollections, canonicalCollections);
      const reorder = vi.spyOn(MutationConfigs, 'reorderAdminCollections')
        .mockResolvedValue(response(canonicalCollections));
      renderWithProviders(<AdminCollectionsPageClient />);

      await screen.findAllByText('First Collection');
      dragCollection(layout, 'collection-3', 'collection-1');

      expect(renderedIds('admin-collections-desktop-table')).toEqual([
        'collection-3', 'collection-1', 'collection-2',
      ]);
      await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
      expect(reorder.mock.calls[0]?.[0]).toEqual({
        collectionIds: ['collection-3', 'collection-1', 'collection-2'],
      });
      await waitFor(() => expect(toastMocks.success).toHaveBeenCalledWith('Collection order saved.'));
      expect(renderedIds('admin-collections-mobile-list')).toEqual([
        'collection-3', 'collection-1', 'collection-2',
      ]);
    },
  );

  it('restores the exact previous order when persistence fails', async () => {
    mockCollectionsQuery(initialCollections, initialCollections);
    vi.spyOn(MutationConfigs, 'reorderAdminCollections').mockRejectedValue(new Error('network down'));
    const { queryClient } = renderWithProviders(<AdminCollectionsPageClient />);

    await screen.findAllByText('First Collection');
    dragCollection('desktop', 'collection-3', 'collection-1');
    expect(renderedIds('admin-collections-desktop-table')[0]).toBe('collection-3');

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(renderedIds('admin-collections-desktop-table')).toEqual([
      'collection-1', 'collection-2', 'collection-3',
    ]));
    expect(
      queryClient.getQueryData<AxiosResponse<IBaseApiResponse<ICollection[]>>>(
        adminCollectionKeys.list(),
      )?.data.data,
    ).toEqual(initialCollections);
    expect(toastMocks.success).not.toHaveBeenCalled();
  });

  it('prevents a second reorder while the first mutation is in flight', async () => {
    let resolveReorder: ((value: AxiosResponse<IBaseApiResponse<ICollection[]>>) => void) | undefined;
    const pendingReorder = new Promise<AxiosResponse<IBaseApiResponse<ICollection[]>>>((resolve) => {
      resolveReorder = resolve;
    });
    mockCollectionsQuery(initialCollections, canonicalCollections);
    const reorder = vi.spyOn(MutationConfigs, 'reorderAdminCollections').mockReturnValue(pendingReorder);
    renderWithProviders(<AdminCollectionsPageClient />);

    await screen.findAllByText('First Collection');
    const dragEnd = latestDragEnd('desktop');
    act(() => {
      dragEnd({
        active: { id: 'desktop:collection-3' },
        over: { id: 'desktop:collection-1' },
      });
      dragEnd({
        active: { id: 'desktop:collection-2' },
        over: { id: 'desktop:collection-1' },
      });
    });

    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('button', { name: /^Reorder / }).every((button) => button.hasAttribute('disabled'))).toBe(true);

    resolveReorder?.(response(canonicalCollections));
    await waitFor(() => expect(toastMocks.success).toHaveBeenCalledTimes(1));
  });

  it('keeps non-handle content and existing navigation/edit actions independent from sorting', async () => {
    mockCollectionsQuery(initialCollections);
    const reorder = vi.spyOn(MutationConfigs, 'reorderAdminCollections');
    const update = vi.spyOn(MutationConfigs, 'updateAdminCollection').mockResolvedValue({
      ...response([first]),
      data: {
        ...response([first]).data,
        data: first,
      },
    } as AxiosResponse<IBaseApiResponse<ICollection>>);
    renderWithProviders(<AdminCollectionsPageClient />);
    const desktop = await screen.findByTestId('admin-collections-desktop-table');

    const nameLink = within(desktop).getByRole('link', { name: 'First Collection' });
    expect(nameLink).toHaveAttribute('href', '/admin/collections/collection-1');
    await userEvent.click(within(desktop).getByText('first-collection'));
    expect(reorder).not.toHaveBeenCalled();

    await userEvent.click(within(desktop).getAllByRole('button', { name: 'Edit' })[0]!);
    await screen.findByText('Edit Collection');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByText('Sort Order')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Collection' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('sortOrder');
  });

  it('omits sortOrder when creating and renders the refreshed collection last', async () => {
    const appended = collection('collection-4', 'New Collection', 3);
    mockCollectionsQuery([first, second, third], [first, second, third, appended]);
    const create = vi.spyOn(MutationConfigs, 'createAdminCollection').mockResolvedValue({
      ...response([appended]),
      data: {
        ...response([appended]).data,
        data: appended,
      },
    } as AxiosResponse<IBaseApiResponse<ICollection>>);
    renderWithProviders(<AdminCollectionsPageClient />);

    await screen.findAllByText('First Collection');
    await userEvent.click(screen.getByRole('button', { name: 'New Collection' }));
    await screen.findByText('Create Collection');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Sort Order')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getAllByRole('textbox')[0]!, 'New Collection');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Collection' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('sortOrder');
    await waitFor(() => expect(renderedIds('admin-collections-desktop-table').at(-1)).toBe('collection-4'));
  });
});
