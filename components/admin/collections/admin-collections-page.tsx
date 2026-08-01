'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Pencil, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type {
  IAdminCollectionReorderRequest,
  ICollection,
} from '@/interfaces/product';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SortableHandle, useAdminSortable } from '@/components/admin/product/sortable-admin-item';
import { moveSortableItems } from '@/components/admin/product/reorder-utils';
import { adminCollectionKeys } from '@/lib/admin-query-keys';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/utils/api-errors';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};

type CollectionLayout = 'desktop' | 'mobile';
type CollectionQueryResponse = AxiosResponse<IBaseApiResponse<ICollection[]>>;

const DEFAULT_FORM: FormState = { name: '', slug: '', description: '', isActive: true };

function getSortableId(layout: CollectionLayout, collectionId: string) {
  return `${layout}:${collectionId}`;
}

function parseSortableId(sortableId: UniqueIdentifier) {
  const value = String(sortableId);
  const separatorIndex = value.indexOf(':');

  if (separatorIndex < 0) return null;

  const layout = value.slice(0, separatorIndex);
  const collectionId = value.slice(separatorIndex + 1);

  if ((layout !== 'desktop' && layout !== 'mobile') || !collectionId) return null;

  return { collectionId, layout } as const;
}

function withCollections(
  response: CollectionQueryResponse,
  collections: ICollection[],
): CollectionQueryResponse {
  return {
    ...response,
    data: {
      ...response.data,
      data: collections,
    },
  };
}

interface ICollectionRowProps {
  collection: ICollection;
  disabled: boolean;
  onEdit: (collection: ICollection) => void;
}

function MobileCollectionCard({ collection, disabled, onEdit }: ICollectionRowProps) {
  const { handleProps, isDragging, setNodeRef, style } = useAdminSortable(
    getSortableId('mobile', collection.id),
    disabled,
  );

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-collection-id={collection.id}
      className={cn(
        'rounded-2xl border border-border/30 bg-background p-4 shadow-sm transition-[background-color,box-shadow,border-color,opacity]',
        isDragging && 'relative z-10 select-none border-primary/20 bg-card shadow-[0_10px_24px_rgba(25,28,30,0.12)]',
      )}
    >
      <div className="flex items-start gap-2">
        <SortableHandle
          label={`Reorder ${collection.name}`}
          disabled={disabled}
          handleProps={handleProps}
          className="h-10 w-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/collections/${collection.id}`}
                className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                {collection.name}
              </Link>
              <code className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{collection.slug}</code>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/admin/collections/${collection.id}`}
                className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">Manage products</span>
              </Link>
              <button
                type="button"
                onClick={() => onEdit(collection)}
                className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </button>
            </div>
          </div>
          <dl className="mt-4 text-sm text-muted-foreground">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${collection.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {collection.isActive ? 'Active' : 'Hidden'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

function DesktopCollectionRow({ collection, disabled, onEdit }: ICollectionRowProps) {
  const { handleProps, isDragging, setNodeRef, style } = useAdminSortable(
    getSortableId('desktop', collection.id),
    disabled,
  );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-collection-id={collection.id}
      className={cn(
        'transition-[background-color,box-shadow] hover:bg-muted/40',
        isDragging && 'relative z-10 select-none bg-card shadow-[0_10px_24px_rgba(25,28,30,0.12)]',
      )}
    >
      <td className="w-16 px-4 py-3">
        <SortableHandle
          label={`Reorder ${collection.name}`}
          disabled={disabled}
          handleProps={handleProps}
          className="mx-auto"
        />
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        <Link
          href={`/admin/collections/${collection.id}`}
          className="transition-colors hover:text-primary"
        >
          {collection.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{collection.slug}</code></td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${collection.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {collection.isActive ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/collections/${collection.id}`}
          className="mr-1 inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">Manage products</span>
        </Link>
        <button
          type="button"
          onClick={() => onEdit(collection)}
          className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </button>
      </td>
    </tr>
  );
}

export default function AdminCollectionsPageClient() {
  const queryClient = useQueryClient();
  const reorderGuardRef = useRef(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReconcilingOrder, setIsReconcilingOrder] = useState(false);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  const { data: fetchRes, isPending } = useCustomizeQuery<ICollection[]>({
    queryKey: adminCollectionKeys.list(),
    queryFn: QueryConfigs.fetchAdminCollections,
  });

  const sortedCollections = useMemo(() => {
    const collections = fetchRes?.data?.data ?? [];

    return [...collections].sort((left, right) => (
      left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
    ));
  }, [fetchRes]);
  const collectionMap = useMemo(
    () => new Map(sortedCollections.map((collection) => [collection.id, collection])),
    [sortedCollections],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { mutationAsync: reorderCollections, isPending: isReordering } = useCustomizeMutation<
    ICollection[],
    IAdminCollectionReorderRequest
  >({
    mutationFn: MutationConfigs.reorderAdminCollections,
  });

  const { mutation: createCollection, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCollectionKeys.list(), exact: true });
      setIsDialogOpen(false);
    },
  });

  const { mutation: updateCollection, isPending: isUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCollectionKeys.list(), exact: true });
      setIsDialogOpen(false);
    },
  });

  const controlsDisabled = isReordering || isReconcilingOrder || isCreating || isUpdating;

  const getCollectionName = useCallback((sortableId: UniqueIdentifier) => {
    const parsedId = parseSortableId(sortableId);
    return parsedId ? collectionMap.get(parsedId.collectionId)?.name ?? 'Collection' : 'Collection';
  }, [collectionMap]);
  const getPosition = useCallback((sortableId: UniqueIdentifier) => {
    const parsedId = parseSortableId(sortableId);
    return parsedId
      ? sortedCollections.findIndex((collection) => collection.id === parsedId.collectionId) + 1
      : 0;
  }, [sortedCollections]);
  const announcements = useMemo(() => ({
    onDragStart({ active }: DragStartEvent) {
      return `Picked up ${getCollectionName(active.id)}. Position ${getPosition(active.id)} of ${sortedCollections.length}.`;
    },
    onDragOver({ active, over }: DragOverEvent) {
      if (!over) return `${getCollectionName(active.id)} is no longer over a sortable position.`;
      return `${getCollectionName(active.id)} moved over position ${getPosition(over.id)} of ${sortedCollections.length}.`;
    },
    onDragEnd({ active, over }: DragEndEvent) {
      if (!over) return `${getCollectionName(active.id)} was dropped without changing position.`;
      return `${getCollectionName(active.id)} was dropped at position ${getPosition(over.id)} of ${sortedCollections.length}.`;
    },
    onDragCancel({ active }: DragCancelEvent) {
      return `Sorting cancelled. ${getCollectionName(active.id)} returned to position ${getPosition(active.id)}.`;
    },
  }), [getCollectionName, getPosition, sortedCollections.length]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const active = parseSortableId(event.active.id);
    const over = event.over ? parseSortableId(event.over.id) : null;

    if (
      !active
      || !over
      || active.layout !== over.layout
      || active.collectionId === over.collectionId
      || reorderGuardRef.current
    ) {
      return;
    }

    const nextCollections = moveSortableItems(
      sortedCollections,
      active.collectionId,
      over.collectionId,
    );

    if (nextCollections === sortedCollections) return;

    const queryKey = adminCollectionKeys.list();
    const snapshot = queryClient.getQueryData<CollectionQueryResponse>(queryKey) ?? fetchRes;

    if (!snapshot) return;

    reorderGuardRef.current = true;
    setIsReconcilingOrder(true);
    const cancellation = queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, withCollections(snapshot, nextCollections));

    void (async () => {
      try {
        await cancellation;
        const response = await reorderCollections({
          collectionIds: nextCollections.map((collection) => collection.id),
        });
        queryClient.setQueryData(queryKey, response);
        toast.success('Collection order saved.');
      } catch (error) {
        queryClient.setQueryData(queryKey, snapshot);
        toast.error(getFriendlyErrorMessage(error, 'Unable to save collection order. Please try again.'));
      } finally {
        try {
          await queryClient.invalidateQueries({ queryKey, exact: true });
        } finally {
          reorderGuardRef.current = false;
          setIsReconcilingOrder(false);
        }
      }
    })();
  }, [fetchRes, queryClient, reorderCollections, sortedCollections]);

  const openCreateDialog = () => {
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = useCallback((collection: ICollection) => {
    setFormData({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      isActive: collection.isActive,
    });
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, ''),
      description: formData.description || null,
      isActive: formData.isActive,
    };

    if (formData.id) {
      updateCollection({ id: formData.id, data: payload });
    } else {
      createCollection(payload);
    }
  };

  const dndAccessibility = {
    announcements,
    screenReaderInstructions: {
      draggable: 'To pick up a collection, press space or enter. Use the arrow keys to move it, then press space or enter to drop it. Press escape to cancel.',
    },
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Collections</h1>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      <div className="rounded-xl border border-border/30 bg-card">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading collections...</div>
        ) : sortedCollections.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No collections found. Create your first collection to organize products.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 sm:hidden" data-testid="admin-collections-mobile-list">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                accessibility={dndAccessibility}
              >
                <SortableContext
                  items={sortedCollections.map((collection) => getSortableId('mobile', collection.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedCollections.map((collection) => (
                    <MobileCollectionCard
                      key={collection.id}
                      collection={collection}
                      disabled={controlsDisabled}
                      onEdit={openEditDialog}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="hidden overflow-x-auto sm:block" data-testid="admin-collections-desktop-table">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                accessibility={dndAccessibility}
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="w-16 px-4 py-3"><span className="sr-only">Order</span></th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={sortedCollections.map((collection) => getSortableId('desktop', collection.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border/30">
                      {sortedCollections.map((collection) => (
                        <DesktopCollectionRow
                          key={collection.id}
                          collection={collection}
                          disabled={controlsDisabled}
                          onEdit={openEditDialog}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border-border/50 bg-card p-4 sm:max-w-md sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {formData.id ? 'Edit Collection' : 'Create Collection'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <Input required value={formData.name} onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Slug <span className="font-normal text-muted-foreground">(Optional)</span></label>
              <Input value={formData.slug} onChange={event => setFormData(previous => ({ ...previous, slug: event.target.value }))} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={event => setFormData(previous => ({ ...previous, description: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.isActive ? 'true' : 'false'}
                onChange={event => setFormData(previous => ({ ...previous, isActive: event.target.value === 'true' }))}
              >
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex-col-reverse gap-2 border-t border-border/20 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
                disabled={isCreating || isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 sm:w-auto"
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save Collection'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
