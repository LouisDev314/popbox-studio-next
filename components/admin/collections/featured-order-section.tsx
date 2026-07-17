'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { getApiErrorCode, getFriendlyErrorMessage } from '@/utils/api-errors';
import type { IAdminFeaturedOrderItem, IAdminFeaturedOrderResponse } from '@/interfaces/product';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { StorefrontImage } from '@/components/ui/storefront-image';

interface IFeaturedOrderSectionProps {
  isError: boolean;
  isLoading: boolean;
  isMembershipMutationPending: boolean;
  items: IAdminFeaturedOrderItem[];
  onAddProductsClick: () => void;
  onRemoveProduct: (product: IAdminFeaturedOrderItem) => void;
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

export function FeaturedOrderSection({
  isError,
  isLoading,
  isMembershipMutationPending,
  items,
  onAddProductsClick,
  onReload,
  onRemoveProduct,
}: IFeaturedOrderSectionProps) {
  const queryClient = useQueryClient();
  const submissionGuard = useRef(false);
  const observedItemsRef = useRef(items);
  const [persistedItems, setPersistedItems] = useState<IAdminFeaturedOrderItem[]>(items);
  const [draftIds, setDraftIds] = useState<string[]>(items.map((item) => item.id));
  const [isInitialized, setIsInitialized] = useState(!isLoading && !isError);
  const [hasMembershipConflict, setHasMembershipConflict] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const persistedIds = useMemo(() => persistedItems.map((item) => item.id), [persistedItems]);
  const isDirty = isInitialized && !idsMatch(draftIds, persistedIds);
  const itemMap = useMemo(() => new Map(persistedItems.map((item) => [item.id, item])), [persistedItems]);
  const draftItems = draftIds.flatMap((id) => {
    const item = itemMap.get(id);
    return item ? [item] : [];
  });

  const resetOrder = (nextItems: IAdminFeaturedOrderItem[]) => {
    setPersistedItems(nextItems);
    setDraftIds(nextItems.map((item) => item.id));
    setHasMembershipConflict(false);
    setErrorMessage(null);
    setIsInitialized(true);
  };

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
  }, [isDirty, isInitialized, items, persistedIds, persistedItems]);

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

  const moveProduct = (index: number, offset: -1 | 1) => {
    setErrorMessage(null);
    setDraftIds((currentIds) => {
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= currentIds.length) return currentIds;

      const nextIds = [...currentIds];
      [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
      return nextIds;
    });
  };

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
        <ol className="divide-y divide-border/30">
          {draftItems.map((product, index) => (
            <li key={product.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
                  <StorefrontImage
                    alt={product.primaryImage?.altText ?? product.name}
                    src={product.primaryImage?.url ?? null}
                    label={product.name}
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <AdminProductStatusBadge status={product.status} />
                    <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {formatProductType(product.productType)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${product.name} up`}
                  disabled={controlsDisabled || index === 0}
                  onClick={() => moveProduct(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="sm:hidden lg:inline">Up</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${product.name} down`}
                  disabled={controlsDisabled || index === draftItems.length - 1}
                  onClick={() => moveProduct(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="sm:hidden lg:inline">Down</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${product.name} from Featured`}
                  disabled={controlsDisabled || isDirty}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemoveProduct(product)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sm:hidden lg:inline">Remove</span>
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
