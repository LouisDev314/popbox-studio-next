'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { getApiErrorCode, getFriendlyErrorMessage } from '@/utils/api-errors';
import type { IAdminFeaturedOrderItem, IAdminFeaturedOrderResponse } from '@/interfaces/product';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { SortableHandle, useAdminSortable } from '@/components/admin/product/sortable-admin-item';
import { cn } from '@/lib/utils';

interface IFeaturedOrderSectionProps {
  isError: boolean;
  isLoading: boolean;
  isMembershipMutationPending: boolean;
  items: IAdminFeaturedOrderItem[];
  onAddProductsClick: () => void;
  onReload: () => Promise<IAdminFeaturedOrderItem[] | null>;
}

function idsMatch(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function hasSameMembership(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function formatProductType(productType: IAdminFeaturedOrderItem['productType']) {
  return productType === 'kuji' ? 'Kuji' : 'Standard';
}

interface IFeaturedOrderRowContentProps {
  isOverlay?: boolean;
  onRemove?: () => void;
  product: IAdminFeaturedOrderItem;
  removeDisabled?: boolean;
}

const FeaturedOrderRowContent = memo(function FeaturedOrderRowContent({
  isOverlay = false,
  onRemove,
  product,
  removeDisabled = false,
}: IFeaturedOrderRowContentProps) {
  return (
    <>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
        <StorefrontImage
          alt={product.primaryImage?.altText ?? product.name}
          src={product.primaryImage?.url ?? null}
          label={product.name}
          sizes="56px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-foreground">{product.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <AdminProductStatusBadge status={product.status} />
          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {formatProductType(product.productType)}
          </span>
        </div>
      </div>
      {!isOverlay ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove ${product.name} from Featured`}
          disabled={removeDisabled}
          className="shrink-0 self-center text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Remove</span>
        </Button>
      ) : null}
    </>
  );
});

interface IFeaturedOrderRowProps {
  disabled: boolean;
  onRemove: (productId: string) => void;
  product: IAdminFeaturedOrderItem;
}

const FeaturedOrderRow = memo(function FeaturedOrderRow({
  disabled,
  onRemove,
  product,
}: IFeaturedOrderRowProps) {
  const { handleProps, isDragging, setNodeRef, style } = useAdminSortable(product.id, disabled);
  const handleRemove = useCallback(() => onRemove(product.id), [onRemove, product.id]);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-product-id={product.id}
      className={cn(
        'flex min-h-[88px] min-w-0 items-center gap-3 p-4 transition-[background-color,box-shadow,border-color,opacity] sm:gap-4',
        isDragging && 'select-none bg-muted/40 opacity-35',
      )}
    >
      <SortableHandle
        label={`Reorder ${product.name}`}
        disabled={disabled}
        handleProps={handleProps}
        className="h-10 w-10 shrink-0 touch-none"
      />
      <FeaturedOrderRowContent
        product={product}
        removeDisabled={disabled}
        onRemove={handleRemove}
      />
    </li>
  );
});

export function FeaturedOrderSection({
  isError,
  isLoading,
  isMembershipMutationPending,
  items,
  onAddProductsClick,
  onReload,
}: IFeaturedOrderSectionProps) {
  const queryClient = useQueryClient();
  const submissionGuard = useRef(false);
  const observedItemsRef = useRef(items);
  const [persistedItems, setPersistedItems] = useState<IAdminFeaturedOrderItem[]>(items);
  const [draftIds, setDraftIds] = useState<string[]>(items.map((item) => item.id));
  const [isInitialized, setIsInitialized] = useState(!isLoading && !isError);
  const [hasMembershipConflict, setHasMembershipConflict] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const persistedIds = useMemo(() => persistedItems.map((item) => item.id), [persistedItems]);
  const isDirty = isInitialized && !idsMatch(draftIds, persistedIds);
  const itemMap = useMemo(() => new Map(persistedItems.map((item) => [item.id, item])), [persistedItems]);
  const draftItems = useMemo(() => draftIds.flatMap((id) => {
    const item = itemMap.get(id);
    return item ? [item] : [];
  }), [draftIds, itemMap]);
  const activeItem = activeId ? itemMap.get(activeId) ?? null : null;
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

  const resetOrder = useCallback((nextItems: IAdminFeaturedOrderItem[]) => {
    setPersistedItems(nextItems);
    setDraftIds(nextItems.map((item) => item.id));
    setActiveId(null);
    setHasMembershipConflict(false);
    setErrorMessage(null);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (observedItemsRef.current === items) return undefined;
    observedItemsRef.current = items;
    const incomingIds = items.map((item) => item.id);
    let isCancelled = false;

    if (!isInitialized || (!isDirty && persistedItems !== items)) {
      queueMicrotask(() => {
        if (!isCancelled) resetOrder(items);
      });
      return () => {
        isCancelled = true;
      };
    }

    if (!hasSameMembership(incomingIds, persistedIds)) {
      queueMicrotask(() => {
        if (!isCancelled) setHasMembershipConflict(true);
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [isDirty, isInitialized, items, persistedIds, persistedItems, resetOrder]);

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const { mutation: saveOrder, isPending: isSaving } = useCustomizeMutation<
    IAdminFeaturedOrderResponse,
    { productIds: string[] }
  >({
    mutationFn: MutationConfigs.updateAdminFeaturedOrder,
    onSuccess: async (response) => {
      resetOrder(response.data.data.items);
      submissionGuard.current = false;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'featured-order'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] }),
      ]);
      toast.success('Featured product order saved.');
    },
    onError: (error) => {
      submissionGuard.current = false;

      if (getApiErrorCode(error) === 'FEATURED_MEMBERSHIP_CHANGED') {
        setHasMembershipConflict(true);
        setErrorMessage(null);
        return;
      }

      setErrorMessage(getFriendlyErrorMessage(error, 'Unable to save Featured order. Please try again.'));
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setErrorMessage(null);
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setDraftIds((currentIds) => {
      const currentIndex = currentIds.indexOf(String(active.id));
      const nextIndex = currentIds.indexOf(String(over.id));
      if (currentIndex < 0 || nextIndex < 0) return currentIds;
      return arrayMove(currentIds, currentIndex, nextIndex);
    });
  }, []);

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const handleRemove = useCallback((productId: string) => {
    setErrorMessage(null);
    setDraftIds((currentIds) => currentIds.filter((id) => id !== productId));
  }, []);

  const handleSave = () => {
    if (!isDirty || isSaving || hasMembershipConflict || submissionGuard.current) return;
    submissionGuard.current = true;
    setErrorMessage(null);
    saveOrder({ productIds: draftIds });
  };

  const handleDiscard = () => {
    if (!isDirty || window.confirm('Discard your unsaved Featured order changes?')) {
      setDraftIds(persistedIds);
      setErrorMessage(null);
    }
  };

  const handleReload = async () => {
    const nextItems = await onReload();
    if (nextItems) resetOrder(nextItems);
  };

  const controlsDisabled = isSaving
    || isMembershipMutationPending
    || hasMembershipConflict
    || (isError && !isInitialized);

  const getProductName = useCallback((id: string | number) => itemMap.get(String(id))?.name ?? 'Product', [itemMap]);
  const getPosition = useCallback((id: string | number) => draftIds.indexOf(String(id)) + 1, [draftIds]);
  const announcements = useMemo(() => ({
    onDragStart({ active }: DragStartEvent) {
      return `Picked up ${getProductName(active.id)}. Position ${getPosition(active.id)} of ${draftIds.length}.`;
    },
    onDragOver({ active, over }: DragOverEvent) {
      if (!over) return `${getProductName(active.id)} is no longer over a sortable position.`;
      return `${getProductName(active.id)} moved over position ${getPosition(over.id)} of ${draftIds.length}.`;
    },
    onDragEnd({ active, over }: DragEndEvent) {
      if (!over) return `${getProductName(active.id)} was dropped without changing position.`;
      return `${getProductName(active.id)} was dropped at position ${getPosition(over.id)} of ${draftIds.length}.`;
    },
    onDragCancel({ active }: DragCancelEvent) {
      return `Sorting cancelled. ${getProductName(active.id)} returned to position ${getPosition(active.id)}.`;
    },
  }), [draftIds.length, getPosition, getProductName]);

  return (
    <section className="rounded-xl border border-border/30 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/30 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Featured storefront order</h2>
            {isDirty ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Unsaved changes
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">The first active product appears first in the homepage carousel.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={controlsDisabled} onClick={onAddProductsClick}>
            <Plus className="h-4 w-4" />
            Add products
          </Button>
          <Button type="button" variant="outline" disabled={!isDirty || isSaving} onClick={handleDiscard}>
            Discard
          </Button>
          <Button type="button" disabled={!isDirty || controlsDisabled} onClick={handleSave}>
            {isSaving ? 'Saving...' : 'Save order'}
          </Button>
        </div>
      </div>

      {hasMembershipConflict ? (
        <div className="space-y-3 p-5">
          <ErrorAlert message="Featured membership changed while you were editing. Your draft is preserved; reload the products before saving again." />
          <Button type="button" variant="outline" onClick={handleReload} disabled={isLoading}>
            Reload Featured products
          </Button>
        </div>
      ) : null}
      <ErrorAlert message={errorMessage} className="m-5" />

      {isLoading && !isInitialized ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading Featured products...</div>
      ) : isError && !isInitialized ? (
        <div className="space-y-3 p-6">
          <ErrorAlert message="Unable to load Featured products. Please refresh and try again." />
          <Button type="button" variant="outline" onClick={handleReload}>Try again</Button>
        </div>
      ) : draftItems.length === 0 ? (
        <div className="p-12 text-center">
          <p className="font-medium text-foreground">No Featured products yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a product and it will be placed at the end of this list.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: 'To pick up a product, press space or enter. Use the arrow keys to move it, then press space or enter to drop it. Press escape to cancel.',
            },
          }}
        >
          <SortableContext items={draftIds} strategy={verticalListSortingStrategy}>
            <ol className="min-w-0 divide-y divide-border/30 overflow-hidden">
              {draftItems.map((product) => (
                <FeaturedOrderRow
                  key={product.id}
                  product={product}
                  disabled={controlsDisabled}
                  onRemove={handleRemove}
                />
              ))}
            </ol>
          </SortableContext>
          <DragOverlay adjustScale dropAnimation={{ duration: 180, easing: 'ease-out' }}>
            {activeItem ? (
              <div className="flex min-h-[88px] min-w-0 select-none items-center gap-3 rounded-lg border border-primary/30 bg-card p-4 shadow-[0_16px_40px_rgba(25,28,30,0.18)] ring-1 ring-primary/10 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
                  <GripVertical className="h-5 w-5" />
                </div>
                <FeaturedOrderRowContent product={activeItem} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
