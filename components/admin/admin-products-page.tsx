'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
  ADMIN_PRODUCT_DEFAULT_STATUS,
  ADMIN_PRODUCT_STATUS_TABS,
  buildAdminProductsQueryKey,
} from '@/lib/admin-product-filters';
import { cn } from '@/lib/utils';
import { AdminSearchForm } from '@/components/admin/admin-search-form';
import type {
  IAdminProduct,
  IAdminProductListItem,
  IAdminProductListResponse,
  ICollection,
  ITag,
  productStatus,
} from '@/interfaces/product';

// eslint-disable-next-line complexity
export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pageState, setPageState] = useState<{
    cursor?: string;
    products: IAdminProductListItem[];
    nextCursor: string | null;
    signature: string;
  }>({
    cursor: undefined,
    products: [],
    nextCursor: null,
    signature: '',
  });
  const {
    activeTab,
    clearRefinements,
    filters,
    hasActiveRefinements,
    setCollectionId,
    setSort,
    setStatus,
    setTagId,
    setType,
  } = useAdminProductFilters();
  const [searchState, setSearchState] = useState({
    urlSearch: filters.search ?? '',
    value: filters.search ?? '',
  });
  const searchQuery = searchState.urlSearch === (filters.search ?? '') ? searchState.value : filters.search ?? '';
  const hasActiveSearch = Boolean(filters.search);
  const querySignature = `${filters.search ?? ''}|${filters.status}|${filters.productType}|${filters.collectionId}|${filters.tagId}|${filters.sort}`;
  const isSameQuerySignature = pageState.signature === querySignature;
  const products = isSameQuerySignature ? pageState.products : [];
  const nextCursor = isSameQuerySignature ? pageState.nextCursor : null;
  const queryFilters = useMemo(() => ({
    ...filters,
    cursor: isSameQuerySignature ? pageState.cursor : undefined,
  }), [filters, isSameQuerySignature, pageState.cursor]);
  const queryKey = useMemo(() => buildAdminProductsQueryKey(queryFilters), [queryFilters]);

  const handleProductsSuccess = useCallback((response: Awaited<ReturnType<typeof QueryConfigs.fetchAdminProducts>>) => {
    const page = response.data.data;
    setPageState((currentState) => ({
      cursor: queryFilters.cursor,
      products: queryFilters.cursor && currentState.signature === querySignature
        ? [...currentState.products, ...page.items]
        : page.items,
      nextCursor: page.nextCursor,
      signature: querySignature,
    }));
  }, [queryFilters.cursor, querySignature]);

  const {
    isPending,
    isFetching,
    isError,
  } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey,
    queryFn: () => QueryConfigs.fetchAdminProducts(queryFilters),
    onSuccess: handleProductsSuccess,
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
  const hasActiveViewState = hasActiveRefinements;
  const isPageBusy = isCollectionsPending
    || isCollectionsFetching
    || isTagsPending
    || isTagsFetching
    || isPatching;
  const tableStatusFilter = filters.status === ADMIN_PRODUCT_DEFAULT_STATUS
    ? undefined
    : filters.status as productStatus;

  const handleStatusChange = (productId: string, newStatus: productStatus) => {
    patchStatus({ productId, status: newStatus });
  };

  const handleRowClick = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  const handleClearView = () => {
    clearRefinements();
  };

  const replaceProductSearch = useCallback((nextSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSearch) {
      params.set('search', nextSearch);
    } else {
      params.delete('search');
    }

    const nextQueryString = params.toString();
    router.replace(nextQueryString ? `/admin/products?${nextQueryString}` : '/admin/products', { scroll: false });
  }, [router, searchParams]);

  const submitSearch = () => {
    const nextSearch = searchQuery.trim();
    setSearchState({ urlSearch: nextSearch, value: nextSearch });
    replaceProductSearch(nextSearch);
  };

  const clearSearch = () => {
    setSearchState({ urlSearch: '', value: '' });
    replaceProductSearch('');
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
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_34px_-26px_hsl(var(--primary)/0.8)] hover:bg-primary/90"
          >
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              New Product
            </Link>
          </Button>
        </div>

        <section className="rounded-3xl border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
          <AdminSearchForm
            ariaLabel="Search products"
            onChange={(value) => setSearchState({ urlSearch: filters.search ?? '', value })}
            onClear={clearSearch}
            onSubmit={submitSearch}
            placeholder="Search products by name, SKU, collection, or tag"
            value={searchQuery}
          />
          {hasActiveSearch ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8f8577]">
              <span className="rounded-full border border-[#ece4d8] bg-white px-3 py-1">
                Search: {filters.search}
              </span>
            </div>
          ) : null}
        </section>

        <section className="rounded-[24px] border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
          <div className="flex flex-wrap gap-1.5">
            {ADMIN_PRODUCT_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  activeTab === tab.value
                    ? 'bg-primary/20 text-primary-foreground'
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
            isCollectionsLoading={isCollectionsPending || isCollectionsFetching}
            isTagsError={isTagsError}
            isTagsLoading={isTagsPending || isTagsFetching}
            onClearView={handleClearView}
            onCollectionChange={setCollectionId}
            onSortChange={setSort}
            onTagChange={setTagId}
            onTypeChange={setType}
            tags={tags}
          />

          <div className="mt-6">
            {isPending && products.length === 0 ? (
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
                products={products}
                statusFilter={tableStatusFilter}
              />
            )}
            {nextCursor ? (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-[#dfd5c5] bg-white px-5 text-sm text-[#111827] hover:bg-[#f8f4eb]"
                  disabled={isFetching}
                  onClick={() => {
                    setPageState((currentState) => ({
                      ...currentState,
                      cursor: nextCursor,
                      signature: querySignature,
                    }));
                  }}
                >
                  {isFetching ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            ) : null}
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
