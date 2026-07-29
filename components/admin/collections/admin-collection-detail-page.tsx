'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import {
  ADMIN_PRODUCT_LIST_LIMIT,
  buildAdminProductListKeyParams,
} from '@/lib/admin-product-filters';
import { flattenUniquePages, getProductListTotalCount } from '@/lib/admin-query-cache';
import {
  adminCollectionKeys,
  adminProductKeys,
} from '@/lib/admin-query-keys';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/utils/api-errors';
import type {
  IAdminFeaturedOrderItem,
  IAdminFeaturedOrderResponse,
  IAdminProductListItem,
  ICollection,
} from '@/interfaces/product';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { FeaturedOrderSection } from '@/components/admin/collections/featured-order-section';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { StorefrontImage } from '@/components/ui/storefront-image';

function formatPrice(product: Pick<IAdminProductListItem, 'currency' | 'priceCents'>) {
  return new Intl.NumberFormat('en-CA', {
    currency: product.currency || 'CAD',
    style: 'currency',
  }).format(product.priceCents / 100);
}

function formatProductType(productType: IAdminProductListItem['productType']) {
  return productType === 'kuji' ? 'Kuji' : 'Standard';
}

function getProductImageSrc(product: IAdminProductListItem) {
  return product.primaryImage?.url ?? null;
}

function getCollectionIds(product: Pick<IAdminProductListItem, 'collections'>) {
  return product.collections.map((collection) => String(collection.id));
}

function mergeCollectionIds(product: IAdminProductListItem, collectionId: string) {
  return Array.from(new Set([...getCollectionIds(product), collectionId]));
}

function removeCollectionId(product: Pick<IAdminProductListItem, 'collections'>, collectionId: string) {
  return getCollectionIds(product).filter((id) => id !== collectionId);
}

interface IProductRowProps {
  collectionId: string;
  isBusy: boolean;
  onRemove: (product: IAdminProductListItem) => void;
  product: IAdminProductListItem;
}

function ProductRow({ collectionId, isBusy, onRemove, product }: IProductRowProps) {
  return (
    <tr className="transition-colors hover:bg-muted/35">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-lg border border-border/50 bg-muted">
            <StorefrontImage
              alt={product.primaryImage?.altText ?? product.name}
              src={getProductImageSrc(product)}
              label={product.name}
              sizes="56px"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <AdminProductStatusBadge status={product.status} />
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {formatProductType(product.productType)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-foreground tabular-nums">
        {formatPrice(product)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy || !getCollectionIds(product).includes(collectionId)}
          className="h-8 rounded-md px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(product)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remove
        </Button>
      </td>
    </tr>
  );
}

interface IAddProductsDialogProps {
  assignedProductIds: Set<string>;
  collectionId: string;
  isOpen: boolean;
  isSaving: boolean;
  onConfirm: (products: IAdminProductListItem[]) => void;
  onOpenChange: (isOpen: boolean) => void;
}

function AddProductsDialog({
  assignedProductIds,
  collectionId,
  isOpen,
  isSaving,
  onConfirm,
  onOpenChange,
}: IAddProductsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductsById, setSelectedProductsById] = useState<Record<string, IAdminProductListItem>>({});
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim();
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 300);
  const effectiveSearchQuery = normalizedSearchQuery ? debouncedSearchQuery : '';
  const productQueryFilters = useMemo(() => buildAdminProductListKeyParams({
    excludeCollectionId: collectionId,
    limit: ADMIN_PRODUCT_LIST_LIMIT,
    search: effectiveSearchQuery || undefined,
  }), [collectionId, effectiveSearchQuery]);
  const productsQuery = useInfiniteQuery({
    queryKey: adminProductKeys.list(productQueryFilters),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => (
      await QueryConfigs.fetchAdminProducts({
        ...productQueryFilters,
        cursor: pageParam,
      })
    ).data.data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isOpen,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const {
    data: productPages,
    fetchNextPage: fetchNextProductsPage,
    hasNextPage,
    isError: isProductsListError,
    isFetchNextPageError,
    isFetchingNextPage,
    isPending: isProductsListPending,
    refetch: refetchProducts,
  } = productsQuery;
  const products = useMemo(
    () => flattenUniquePages<IAdminProductListItem>(productPages?.pages),
    [productPages?.pages],
  );
  const eligibleProducts = useMemo(() => products.filter((product) => (
    !assignedProductIds.has(product.id)
    && !getCollectionIds(product).includes(collectionId)
  )), [assignedProductIds, collectionId, products]);
  const selectedProducts = useMemo(
    () => Object.values(selectedProductsById).filter((product) => (
      !assignedProductIds.has(product.id)
      && !getCollectionIds(product).includes(collectionId)
    )),
    [assignedProductIds, collectionId, selectedProductsById],
  );

  const toggleProduct = (product: IAdminProductListItem) => {
    if (assignedProductIds.has(product.id) || getCollectionIds(product).includes(collectionId)) {
      return;
    }

    setSelectedProductsById((currentProducts) => {
      if (currentProducts[product.id]) {
        const nextProducts = { ...currentProducts };
        delete nextProducts[product.id];
        return nextProducts;
      }

      return {
        ...currentProducts,
        [product.id]: product,
      };
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery('');
      setSelectedProductsById({});
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    onConfirm(selectedProducts);
  };

  const isInitialError = isProductsListError && !productPages;
  const isFinalEmptyState = eligibleProducts.length === 0
    && !hasNextPage
    && !isFetchingNextPage;
  const sentinelRef = useInfiniteScrollSentinel({
    enabled: isOpen && !isInitialError && !isFetchNextPageError && !isProductsListPending,
    fetchNextPage: fetchNextProductsPage,
    hasNextPage,
    isError: isInitialError,
    isFetchingNextPage,
    root: scrollContainer,
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent title="Add products" className="max-h-[calc(100dvh-1.5rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] p-0">
        <DialogHeader className="border-b border-border/40 px-5 py-4 sm:px-6">
          <div className="text-xl font-semibold text-foreground">Add products</div>
          <DialogDescription className="sr-only">
            Search and select products to add to this collection.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden px-5 py-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search products"
                className="h-10 pl-9 pr-9"
                placeholder="Search products"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear product search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {selectedProducts.length} selected
            </span>
          </div>

          <div
            ref={setScrollContainer}
            tabIndex={0}
            aria-label="Eligible products"
            className="max-h-[52vh] overflow-y-auto rounded-xl border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isProductsListPending ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Spinner aria-hidden="true" />
                Loading products...
              </div>
            ) : isInitialError ? (
              <div className="space-y-3 p-4">
                <ErrorAlert message="Unable to load products. Please try again." />
                <Button type="button" variant="outline" size="sm" onClick={() => void refetchProducts()}>
                  Try again
                </Button>
              </div>
            ) : isFinalEmptyState ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {effectiveSearchQuery ? 'No products match this search.' : 'No eligible products are available.'}
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/30">
                  {eligibleProducts.map((product) => {
                    const isSelected = Boolean(selectedProductsById[product.id]);

                    return (
                      <label
                        key={product.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/35"
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isSaving}
                          onCheckedChange={() => toggleProduct(product)}
                          aria-label={`Select ${product.name}`}
                        />
                        <div className="h-11 w-11 overflow-hidden rounded-md border border-border/50 bg-muted">
                          <StorefrontImage
                            alt={product.primaryImage?.altText ?? product.name}
                            src={getProductImageSrc(product)}
                            label={product.name}
                            sizes="44px"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {product.sku || 'No SKU'} · {formatProductType(product.productType)} · {formatPrice(product)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-muted-foreground" role="status" aria-live="polite">
                    <Spinner aria-hidden="true" />
                    Loading more products...
                  </div>
                ) : null}
                {isFetchNextPageError ? (
                  <div className="flex items-center justify-center gap-3 px-4 py-3 text-sm text-destructive">
                    <span>More products could not be loaded.</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchNextProductsPage().catch(() => undefined)}
                    >
                      Try again
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => handleOpenChange(false)}
            className="w-full rounded-lg sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSaving || selectedProducts.length === 0}
            onClick={handleConfirm}
            className="w-full rounded-lg sm:w-auto"
          >
            {isSaving ? 'Adding...' : selectedProducts.length > 0 ? `Add ${selectedProducts.length} products` : 'Add products'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollectionMetadataCard({
  collection,
  productCount,
}: {
  collection: ICollection;
  productCount: number;
}) {
  return (
    <section className="rounded-xl border border-border/30 bg-card p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Slug</dt>
          <dd className="mt-1">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{collection.slug}</code>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Sort order</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{collection.sortOrder}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Status</dt>
          <dd className="mt-1">
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                collection.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {collection.isActive ? 'Active' : 'Hidden'}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Products</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{productCount}</dd>
        </div>
      </div>
      {collection.description ? (
        <p className="mt-4 border-t border-border/30 pt-4 text-sm leading-6 text-muted-foreground">{collection.description}</p>
      ) : null}
    </section>
  );
}

interface ICollectionProductsSectionProps {
  assignedProducts: IAdminProductListItem[];
  collection: ICollection;
  hasNextPage: boolean;
  isAssignedProductsError: boolean;
  isAssignedProductsPending: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isMutatingProducts: boolean;
  loadMoreRef: (node: Element | null) => void;
  onAddProductsClick: () => void;
  onRetryInitial: () => void;
  onRetryNextPage: () => void;
  onRemoveProduct: (product: IAdminProductListItem) => void;
  pendingProductIds: string[];
}

function CollectionProductsSection({
  assignedProducts,
  collection,
  hasNextPage,
  isAssignedProductsError,
  isAssignedProductsPending,
  isFetchNextPageError,
  isFetchingNextPage,
  isMutatingProducts,
  loadMoreRef,
  onAddProductsClick,
  onRetryInitial,
  onRetryNextPage,
  onRemoveProduct,
  pendingProductIds,
}: ICollectionProductsSectionProps) {
  return (
    <section className="rounded-xl border border-border/30 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/30 p-5 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Products in this collection</h2>
        <Button
          type="button"
          className="h-9 w-full rounded-lg sm:w-auto"
          onClick={onAddProductsClick}
          disabled={isMutatingProducts}
        >
          <Plus className="h-4 w-4" />
          Add products
        </Button>
      </div>

      {/* TODO: Add collection-specific product ordering endpoint before exposing manual product order controls. */}
      {isAssignedProductsPending ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading products...</div>
      ) : isAssignedProductsError ? (
        <div className="space-y-3 p-6">
          <ErrorAlert message="Unable to load products for this collection. Please refresh and try again." />
          <Button type="button" variant="outline" size="sm" onClick={onRetryInitial}>
            Try again
          </Button>
        </div>
      ) : assignedProducts.length === 0 ? (
        <div className="p-12 text-center">
          <p className="font-medium text-foreground">No products in this collection yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Add products to control what appears on this collection page.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 sm:hidden">
            {assignedProducts.map((product) => (
              <article key={product.id} className="rounded-xl border border-border/40 bg-background p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-border/50 bg-muted">
                    <StorefrontImage
                      alt={product.primaryImage?.altText ?? product.name}
                      src={getProductImageSrc(product)}
                      label={product.name}
                      sizes="64px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <AdminProductStatusBadge status={product.status} />
                      <span className="inline-flex rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {formatProductType(product.productType)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{formatPrice(product)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingProductIds.includes(product.id)}
                    className="h-8 rounded-md px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemoveProduct(product)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {assignedProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    collectionId={collection.id}
                    isBusy={pendingProductIds.includes(product.id)}
                    onRemove={onRemoveProduct}
                    product={product}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage ? <div ref={loadMoreRef} className="h-px" aria-hidden="true" /> : null}
          {isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Spinner aria-hidden="true" />
              Loading more products...
            </div>
          ) : null}
          {isFetchNextPageError ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-4 text-sm text-destructive sm:flex-row">
              <span>More collection products could not be loaded.</span>
              <Button type="button" variant="outline" size="sm" onClick={onRetryNextPage}>
                Try again
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// eslint-disable-next-line complexity
export default function AdminCollectionDetailPageClient({ collectionId }: { collectionId: string }) {
  const queryClient = useQueryClient();
  const membershipMutationGuard = useRef(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [localMembershipSignature, setLocalMembershipSignature] = useState<string | null>(null);
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(null);

  const {
    data: collectionsRes,
    isPending: isCollectionPending,
    isError: isCollectionError,
  } = useCustomizeQuery<ICollection[]>({
    queryKey: adminCollectionKeys.list(),
    queryFn: QueryConfigs.fetchAdminCollections,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const collection = useMemo(
    () => collectionsRes?.data?.data?.find((item) => item.id === collectionId) ?? null,
    [collectionId, collectionsRes?.data?.data],
  );
  const isFeaturedCollection = collection?.slug === 'featured';
  const assignedProductFilters = useMemo(
    () => buildAdminProductListKeyParams({
      collectionId,
      limit: ADMIN_PRODUCT_LIST_LIMIT,
    }),
    [collectionId],
  );
  const assignedProductsQuery = useInfiniteQuery({
    queryKey: adminProductKeys.list(assignedProductFilters),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => (
      await QueryConfigs.fetchAdminProducts({
        ...assignedProductFilters,
        cursor: pageParam,
      })
    ).data.data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(collection && !isFeaturedCollection),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const featuredOrderQuery = useCustomizeQuery<IAdminFeaturedOrderResponse>({
    queryKey: adminCollectionKeys.featuredOrder(),
    queryFn: QueryConfigs.fetchAdminFeaturedOrder,
    enabled: isFeaturedCollection,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const featuredOrder = featuredOrderQuery.data?.data?.data ?? null;
  const featuredItems = useMemo(() => featuredOrder?.items ?? [], [featuredOrder]);
  const assignedProducts = useMemo(
    () => flattenUniquePages<IAdminProductListItem>(assignedProductsQuery.data?.pages),
    [assignedProductsQuery.data?.pages],
  );
  const assignedProductIds = useMemo(
    () => new Set((isFeaturedCollection ? featuredItems : assignedProducts).map((product) => product.id)),
    [assignedProducts, featuredItems, isFeaturedCollection],
  );
  const isMutatingProducts = pendingProductIds.length > 0;
  const isAssignedProductsInitialError = assignedProductsQuery.isError && !assignedProductsQuery.data;
  const assignedProductsSentinelRef = useInfiniteScrollSentinel({
    enabled: !isFeaturedCollection
      && !isAssignedProductsInitialError
      && !assignedProductsQuery.isFetchNextPageError
      && !assignedProductsQuery.isPending,
    fetchNextPage: assignedProductsQuery.fetchNextPage,
    hasNextPage: assignedProductsQuery.hasNextPage,
    isError: isAssignedProductsInitialError,
    isFetchingNextPage: assignedProductsQuery.isFetchingNextPage,
  });

  const refreshProductQueries = async (
    refreshFeaturedOrder: boolean,
    affectedProductIds: readonly string[],
  ) => {
    const [featuredRefetchResult] = await Promise.all([
      refreshFeaturedOrder
        ? featuredOrderQuery.refetch()
        : Promise.resolve(null),
      queryClient.invalidateQueries({ queryKey: adminProductKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: adminCollectionKeys.list() }),
      ...affectedProductIds.map((productId) => queryClient.invalidateQueries({
        queryKey: adminProductKeys.detail(productId),
        exact: true,
      })),
    ]);

    return featuredRefetchResult && 'data' in featuredRefetchResult
      ? featuredRefetchResult.data?.data.data ?? null
      : null;
  };

  const handleAddProducts = async (products: IAdminProductListItem[]) => {
    if (!collection || products.length === 0 || membershipMutationGuard.current) {
      return;
    }

    membershipMutationGuard.current = true;
    setRequestErrorMessage(null);
    setPendingProductIds(products.map((product) => product.id));

    try {
      if (isFeaturedCollection) {
        await queryClient.cancelQueries({
          queryKey: adminCollectionKeys.featuredOrder(),
          exact: true,
        });
      }

      const results = await Promise.allSettled(
        products.map((product) => MutationConfigs.updateAdminProduct({
          productId: product.id,
          data: {
            collectionIds: mergeCollectionIds(product, collection.id),
          },
        })),
      );
      const failureCount = results.filter((result) => result.status === 'rejected').length;
      const successfulProducts = products.filter((_, index) => results[index]?.status === 'fulfilled');
      const successCount = successfulProducts.length;

      if (successCount > 0) {
        const confirmedFeaturedOrder = await refreshProductQueries(
          Boolean(isFeaturedCollection),
          successfulProducts.map((product) => product.id),
        );
        if (confirmedFeaturedOrder) {
          setLocalMembershipSignature(confirmedFeaturedOrder.membershipSignature);
        }
        toast.success(`${successCount} product${successCount === 1 ? '' : 's'} added to ${collection.name}.`);
        setIsAddDialogOpen(false);
      }

      if (failureCount > 0) {
        const message = `${failureCount} product${failureCount === 1 ? '' : 's'} could not be added. Please try again.`;
        setRequestErrorMessage(message);
        toast.error(message);
      }
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        'Products were updated, but the collection could not be refreshed. Reload this page before continuing.',
      );
      setRequestErrorMessage(message);
      toast.error(message);
    } finally {
      membershipMutationGuard.current = false;
      setPendingProductIds([]);
    }
  };

  const handleRemoveProduct = async (product: IAdminProductListItem | IAdminFeaturedOrderItem) => {
    if (!collection || membershipMutationGuard.current) {
      return;
    }

    membershipMutationGuard.current = true;
    setRequestErrorMessage(null);
    setPendingProductIds([product.id]);

    try {
      await MutationConfigs.updateAdminProduct({
        productId: product.id,
        data: {
          collectionIds: removeCollectionId(product, collection.id),
        },
      });
      await refreshProductQueries(false, [product.id]);
      toast.success(`${product.name} removed from ${collection.name}.`);
    } catch (error) {
      const message = getFriendlyErrorMessage(error, 'Unable to remove product from this collection. Please try again.');
      setRequestErrorMessage(message);
      toast.error(message);
    } finally {
      membershipMutationGuard.current = false;
      setPendingProductIds([]);
    }
  };

  const reloadFeaturedProducts = async () => {
    const response = await featuredOrderQuery.refetch();
    return response.isError ? null : response.data?.data?.data ?? null;
  };

  if (isCollectionPending) {
    return <div className="p-12 text-center text-muted-foreground">Loading collection...</div>;
  }

  if (isCollectionError || !collection) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Button asChild type="button" variant="outline" className="rounded-lg">
          <Link href="/admin/collections">
            <ArrowLeft className="h-4 w-4" />
            Back to collections
          </Link>
        </Button>
        <ErrorAlert message="Unable to load this collection. Please return to collections and try again." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Button asChild type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border/50 text-muted-foreground">
          <Link href="/admin/collections" aria-label="Back to collections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{collection.name}</h1>
      </div>

      <ErrorAlert message={requestErrorMessage} />

      <CollectionMetadataCard
        collection={collection}
        productCount={isFeaturedCollection
          ? featuredItems.length
          : getProductListTotalCount(assignedProductsQuery.data?.pages) ?? assignedProducts.length}
      />

      {isFeaturedCollection ? (
        <FeaturedOrderSection
          featuredCollection={collection}
          featuredOrder={featuredOrder}
          isError={featuredOrderQuery.isError}
          isLoading={featuredOrderQuery.isPending || featuredOrderQuery.isFetching}
          localMembershipSignature={localMembershipSignature}
          isMembershipMutationPending={isMutatingProducts}
          onAddProductsClick={() => setIsAddDialogOpen(true)}
          onReload={reloadFeaturedProducts}
        />
      ) : (
        <CollectionProductsSection
          assignedProducts={assignedProducts}
          collection={collection}
          hasNextPage={assignedProductsQuery.hasNextPage}
          isAssignedProductsError={isAssignedProductsInitialError}
          isAssignedProductsPending={assignedProductsQuery.isPending}
          isFetchNextPageError={assignedProductsQuery.isFetchNextPageError}
          isFetchingNextPage={assignedProductsQuery.isFetchingNextPage}
          isMutatingProducts={isMutatingProducts}
          loadMoreRef={assignedProductsSentinelRef}
          onAddProductsClick={() => setIsAddDialogOpen(true)}
          onRetryInitial={() => void assignedProductsQuery.refetch().catch(() => undefined)}
          onRetryNextPage={() => void assignedProductsQuery.fetchNextPage().catch(() => undefined)}
          onRemoveProduct={handleRemoveProduct}
          pendingProductIds={pendingProductIds}
        />
      )}

      <AddProductsDialog
        key={collectionId}
        assignedProductIds={assignedProductIds}
        collectionId={collectionId}
        isOpen={isAddDialogOpen}
        isSaving={isMutatingProducts}
        onConfirm={handleAddProducts}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
