'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import { AdminProductsFilterBar } from '@/components/admin/admin-products-filter-bar';
import {
  AdminProductsLoadingSkeleton,
  AdminProductsTable,
} from '@/components/admin/admin-products-table';
import { Button } from '@/components/ui/button';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useAdminProductFilters } from '@/hooks/use-admin-product-filters';
import { ADMIN_PRODUCT_STATUS_TABS } from '@/lib/admin-product-filters';
import { cn } from '@/lib/utils';
import type {
  IAdminProduct,
  IAdminProductListResponse,
  ICollection,
  ITag,
  productStatus,
} from '@/interfaces/product';

export default function AdminProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    activeTab,
    clearRefinements,
    clearTags,
    filters,
    hasActiveRefinements,
    queryKey,
    setCollectionId,
    setSort,
    setStatus,
    setType,
    toggleTag,
  } = useAdminProductFilters();

  const { data, isPending, isError } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey,
    queryFn: () => QueryConfigs.fetchAdminProducts(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: collectionsRes, isError: isCollectionsError } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const { data: tagsRes, isError: isTagsError } = useCustomizeQuery<ITag[]>({
    queryKey: ['admin', 'tags'],
    queryFn: QueryConfigs.fetchAdminTags,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const { mutation: patchStatus, isPending: isPatching } = useCustomizeMutation<
    IAdminProduct,
    { productId: string; status: productStatus }
  >({
    mutationFn: MutationConfigs.patchAdminProductStatus,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const products = data?.data?.data?.items ?? [];
  const collections = useMemo(
    () => [...(collectionsRes?.data?.data ?? [])].sort((left, right) => (
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    )),
    [collectionsRes?.data?.data],
  );
  const tags = useMemo(
    () => [...(tagsRes?.data?.data ?? [])].sort((left, right) => (
      left.tagType.localeCompare(right.tagType) || left.name.localeCompare(right.name)
    )),
    [tagsRes?.data?.data],
  );
  const collectionNameById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  );

  const handleStatusChange = (productId: string, newStatus: productStatus) => {
    patchStatus({ productId, status: newStatus });
  };

  const handleRowClick = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your product catalog, inventory, merchandising, and pricing.
          </p>
        </div>
        <Button asChild className="h-9 rounded-lg px-4 text-sm shadow-sm">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex gap-1 border-b border-border/20">
        {ADMIN_PRODUCT_STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant="ghost"
            className={cn(
              'relative h-auto rounded-none px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'text-foreground'
                : 'text-muted-foreground/70 hover:text-foreground',
            )}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
            {activeTab === tab.value ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
            ) : null}
          </Button>
        ))}
      </div>

      <AdminProductsFilterBar
        collections={collections}
        collectionNameById={collectionNameById}
        filters={filters}
        hasActiveRefinements={hasActiveRefinements}
        isCollectionsError={isCollectionsError}
        isPending={isPending}
        isTagsError={isTagsError}
        onClearRefinements={clearRefinements}
        onClearTags={clearTags}
        onCollectionChange={setCollectionId}
        onSortChange={setSort}
        onTagToggle={toggleTag}
        onTypeChange={setType}
        productsCount={products.length}
        tags={tags}
      />

      <div className="mt-6">
        {isPending ? (
          <AdminProductsLoadingSkeleton />
        ) : isError ? (
          <div className="rounded-xl bg-destructive/5 py-16 text-center">
            <p className="font-medium text-destructive">
              Failed to load products. Please try again.
            </p>
          </div>
        ) : (
          <AdminProductsTable
            collectionNameById={collectionNameById}
            hasActiveRefinements={hasActiveRefinements}
            isPatching={isPatching}
            onClearRefinements={clearRefinements}
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            products={products}
            statusFilter={filters.status}
          />
        )}
      </div>
    </div>
  );
}
