'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { filterAdminProductsBySearch } from '@/lib/admin-product-filters';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/utils/api-errors';
import type { IAdminProductListItem, IAdminProductListResponse, ICollection } from '@/interfaces/product';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
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

function removeCollectionId(product: IAdminProductListItem, collectionId: string) {
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
  isOpen: boolean;
  isProductsError: boolean;
  isSaving: boolean;
  onConfirm: (products: IAdminProductListItem[]) => void;
  onOpenChange: (isOpen: boolean) => void;
  products: IAdminProductListItem[];
}

function AddProductsDialog({
  assignedProductIds,
  isOpen,
  isProductsError,
  isSaving,
  onConfirm,
  onOpenChange,
  products,
}: IAddProductsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const selectedProductIdSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const searchedProducts = useMemo(() => filterAdminProductsBySearch(
    products,
    { query: deferredSearchQuery },
  ).items, [deferredSearchQuery, products]);
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIdSet.has(product.id) && !assignedProductIds.has(product.id)),
    [assignedProductIds, products, selectedProductIdSet],
  );

  const toggleProduct = (product: IAdminProductListItem) => {
    if (assignedProductIds.has(product.id)) {
      return;
    }

    setSelectedProductIds((currentIds) => (
      currentIds.includes(product.id)
        ? currentIds.filter((id) => id !== product.id)
        : [...currentIds, product.id]
    ));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery('');
      setSelectedProductIds([]);
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    onConfirm(selectedProducts);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent title="Add products" className="max-h-[calc(100dvh-1.5rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] p-0">
        <DialogHeader className="border-b border-border/40 px-5 py-4 sm:px-6">
          <div className="text-xl font-semibold text-foreground">Add products</div>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden px-5 py-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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

          <div className="max-h-[52vh] overflow-y-auto rounded-xl border border-border/40">
            {isProductsError ? (
              <div className="p-4">
                <ErrorAlert message="Unable to load products. Please close this dialog and try again." />
              </div>
            ) : searchedProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No products match this search.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {searchedProducts.map((product) => {
                  const isAssigned = assignedProductIds.has(product.id);
                  const isSelected = selectedProductIdSet.has(product.id);

                  return (
                    <label
                      key={product.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 transition-colors',
                        isAssigned ? 'bg-muted/35 text-muted-foreground' : 'cursor-pointer hover:bg-muted/35',
                      )}
                    >
                      <Checkbox
                        checked={isSelected || isAssigned}
                        disabled={isAssigned || isSaving}
                        onCheckedChange={() => toggleProduct(product)}
                        aria-label={isAssigned ? `${product.name} already in collection` : `Select ${product.name}`}
                      />
                      <div className="h-11 w-11 overflow-hidden rounded-md border border-border/50 bg-muted">
                        <StorefrontImage
                          alt={product.primaryImage?.altText ?? product.name}
                          src={getProductImageSrc(product)}
                          label={product.name}
                          sizes="44px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                          {isAssigned ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              Already in collection
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {product.sku || 'No SKU'} · {formatProductType(product.productType)} · {formatPrice(product)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
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
  isAssignedProductsError: boolean;
  isAssignedProductsPending: boolean;
  isMutatingProducts: boolean;
  onAddProductsClick: () => void;
  onRemoveProduct: (product: IAdminProductListItem) => void;
  pendingProductIds: string[];
}

function CollectionProductsSection({
  assignedProducts,
  collection,
  isAssignedProductsError,
  isAssignedProductsPending,
  isMutatingProducts,
  onAddProductsClick,
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
        <div className="p-6">
          <ErrorAlert message="Unable to load products for this collection. Please refresh and try again." />
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
        </>
      )}
    </section>
  );
}

export default function AdminCollectionDetailPageClient({ collectionId }: { collectionId: string }) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(null);

  const {
    data: collectionsRes,
    isPending: isCollectionPending,
    isError: isCollectionError,
  } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: productsRes,
    isError: isProductsError,
    isPending: isProductsPending,
  } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey: ['admin', 'products', 'collection-membership'],
    queryFn: () => QueryConfigs.fetchAdminProducts({}),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const collection = useMemo(
    () => collectionsRes?.data?.data?.find((item) => item.id === collectionId) ?? null,
    [collectionId, collectionsRes?.data?.data],
  );
  const assignedProducts = useMemo(
    () => (productsRes?.data?.data?.items ?? []).filter((product) => (
      getCollectionIds(product).includes(collectionId)
    )),
    [collectionId, productsRes?.data?.data?.items],
  );
  const allProducts = productsRes?.data?.data?.items ?? [];
  const assignedProductIds = useMemo(
    () => new Set(assignedProducts.map((product) => product.id)),
    [assignedProducts],
  );
  const isMutatingProducts = pendingProductIds.length > 0;

  const refreshProductQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] }),
    ]);
  };

  const handleAddProducts = async (products: IAdminProductListItem[]) => {
    if (!collection || products.length === 0) {
      return;
    }

    setRequestErrorMessage(null);
    setPendingProductIds(products.map((product) => product.id));

    const results = await Promise.allSettled(
      products.map((product) => MutationConfigs.updateAdminProduct({
        productId: product.id,
        data: {
          collectionIds: mergeCollectionIds(product, collection.id),
        },
      })),
    );
    const failureCount = results.filter((result) => result.status === 'rejected').length;
    const successCount = products.length - failureCount;

    await refreshProductQueries();
    setPendingProductIds([]);

    if (successCount > 0) {
      toast.success(`${successCount} product${successCount === 1 ? '' : 's'} added to ${collection.name}.`);
      setIsAddDialogOpen(false);
    }

    if (failureCount > 0) {
      const message = `${failureCount} product${failureCount === 1 ? '' : 's'} could not be added. Please try again.`;
      setRequestErrorMessage(message);
      toast.error(message);
    }
  };

  const handleRemoveProduct = async (product: IAdminProductListItem) => {
    if (!collection) {
      return;
    }

    setRequestErrorMessage(null);
    setPendingProductIds([product.id]);

    try {
      await MutationConfigs.updateAdminProduct({
        productId: product.id,
        data: {
          collectionIds: removeCollectionId(product, collection.id),
        },
      });
      await refreshProductQueries();
      toast.success(`${product.name} removed from ${collection.name}.`);
    } catch (error) {
      const message = getFriendlyErrorMessage(error, 'Unable to remove product from this collection. Please try again.');
      setRequestErrorMessage(message);
      toast.error(message);
    } finally {
      setPendingProductIds([]);
    }
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

      <CollectionMetadataCard collection={collection} productCount={assignedProducts.length} />

      <CollectionProductsSection
        assignedProducts={assignedProducts}
        collection={collection}
        isAssignedProductsError={isProductsError}
        isAssignedProductsPending={isProductsPending}
        isMutatingProducts={isMutatingProducts}
        onAddProductsClick={() => setIsAddDialogOpen(true)}
        onRemoveProduct={handleRemoveProduct}
        pendingProductIds={pendingProductIds}
      />

      <AddProductsDialog
        assignedProductIds={assignedProductIds}
        isOpen={isAddDialogOpen}
        isProductsError={isProductsError}
        isSaving={isMutatingProducts || isProductsPending}
        onConfirm={handleAddProducts}
        onOpenChange={setIsAddDialogOpen}
        products={allProducts}
      />
    </div>
  );
}
