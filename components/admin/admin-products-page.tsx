'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { AdminPageLoadingOverlay } from '@/components/admin/admin-page-loading-overlay';
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
import {
  ADMIN_PRODUCT_STATUS_TABS,
  filterAdminProductsBySearch,
} from '@/lib/admin-product-filters';
import { cn } from '@/lib/utils';
import type {
  IAdminProduct,
  IAdminProductListResponse,
  ICollection,
  ITag,
  productStatus,
} from '@/interfaces/product';

interface IProductsSearchPanelProps {
  matchingProductsCount: number;
  onClearSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
  showMatchingCount: boolean;
}

function ProductsSearchPanel(props: IProductsSearchPanelProps) {
  return (
    <section className="rounded-3xl border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
      <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[1.6rem]">
          Search products
      </h2>

      <div className="mt-4 flex flex-col gap-2.5 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={props.searchQuery}
            onChange={(event) => props.onSearchQueryChange(event.target.value)}
            placeholder="Search products"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-[18px] border border-[#dfd5c5] bg-white pl-10 pr-12 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#f4c57d] focus:ring-2 focus:ring-[#f6dfb4]"
          />
          {props.searchQuery && (
            <button
              type="button"
              aria-label="Clear product search"
              onClick={props.onClearSearch}
              className="absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#6b7280] transition-colors hover:bg-[#f8f4eb] hover:text-[#111827]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {props.showMatchingCount && (
          <div className="rounded-[18px] border border-dashed border-[#dfd5c5] bg-[#f8f4eb] px-4 py-2.5 text-sm text-[#6b7280] xl:min-w-[190px]">
            <span className="block font-medium text-[#111827]">
              {props.matchingProductsCount} matching product{props.matchingProductsCount === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
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
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const hasActiveSearch = searchQuery.trim().length > 0;

  const {
    data,
    isPending,
    isFetching,
    isError,
  } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey,
    queryFn: () => QueryConfigs.fetchAdminProducts(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: collectionsRes,
    isPending: isCollectionsPending,
    isFetching: isCollectionsFetching,
    isError: isCollectionsError,
  } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: tagsRes,
    isPending: isTagsPending,
    isFetching: isTagsFetching,
    isError: isTagsError,
  } = useCustomizeQuery<ITag[]>({
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

  const products = useMemo(
    () => data?.data?.data?.items ?? [],
    [data?.data?.data?.items],
  );
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
  const searchedProducts = useMemo(() => filterAdminProductsBySearch(
    products,
    {
      query: deferredSearchQuery,
    },
  ), [deferredSearchQuery, products]);
  const visibleProducts = searchedProducts.items;
  const hasActiveViewState = hasActiveRefinements || hasActiveSearch;
  const isPageBusy = isPending
    || isFetching
    || isCollectionsPending
    || isCollectionsFetching
    || isTagsPending
    || isTagsFetching
    || isPatching;

  const handleStatusChange = (productId: string, newStatus: productStatus) => {
    patchStatus({ productId, status: newStatus });
  };

  const handleRowClick = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  const handleClearView = () => {
    if (hasActiveRefinements) {
      clearRefinements();
    }

    if (hasActiveSearch) {
      setSearchQuery('');
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'space-y-5 transition-opacity duration-200',
          isPageBusy && 'pointer-events-none select-none opacity-80',
        )}
      >
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Products</h1>
          <Button
            asChild
            className="h-10 rounded-xl bg-[#f59e0b] px-4 text-sm font-semibold text-[#111827] shadow-[0_16px_34px_-26px_rgba(245,158,11,0.9)] hover:bg-[#f3aa2f]"
          >
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              New Product
            </Link>
          </Button>
        </div>

        <ProductsSearchPanel
          matchingProductsCount={visibleProducts.length}
          onClearSearch={() => setSearchQuery('')}
          onSearchQueryChange={setSearchQuery}
          searchQuery={searchQuery}
          showMatchingCount={hasActiveSearch}
        />

        <section className="rounded-[24px] border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
          <div className="flex flex-wrap gap-1.5">
            {ADMIN_PRODUCT_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  activeTab === tab.value
                    ? 'bg-[#fff0d9] text-[#b06707]'
                    : 'bg-white text-[#6b7280] hover:bg-[#f8f4eb] hover:text-[#111827]',
                )}
                onClick={() => setStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AdminProductsFilterBar
            collections={collections}
            collectionNameById={collectionNameById}
            filters={filters}
            hasActiveView={hasActiveViewState}
            isCollectionsError={isCollectionsError}
            isTagsError={isTagsError}
            onClearView={handleClearView}
            onClearTags={clearTags}
            onCollectionChange={setCollectionId}
            onSortChange={setSort}
            onTagToggle={toggleTag}
            onTypeChange={setType}
            tags={tags}
          />

          <div className="mt-6">
            {isPending ? (
              <AdminProductsLoadingSkeleton />
            ) : isError ? (
              <div className="rounded-[24px] border border-[#f0d2d2] bg-[#fff7f7] py-16 text-center">
                <p className="font-medium text-[#b42318]">
                  Failed to load products. Please try again.
                </p>
              </div>
            ) : (
              <AdminProductsTable
                hasActiveView={hasActiveViewState}
                isPatching={isPatching}
                onClearView={handleClearView}
                onRowClick={handleRowClick}
                onStatusChange={handleStatusChange}
                products={visibleProducts}
                statusFilter={filters.status}
              />
            )}
          </div>
        </section>
      </div>

      {isPageBusy && (
        <AdminPageLoadingOverlay
          title="Updating products..."
          message="Please wait while the catalog view refreshes."
        />
      )}
    </div>
  );
}
