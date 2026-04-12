'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage, ITag, productType } from '@/interfaces/product';
import { getStorefrontSortHref } from '@/components/layout/store-navigation';
import { ProductCard } from '@/components/product/product-card';
import { FilterPanelContent } from '@/components/product/filter-panel-content';
import { ProductFilterSidebar } from '@/components/product/product-filter-sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatCollectionLabel,
  normalizeTagSlug,
  PRODUCT_SORT_ITEMS,
  parseProductTypeParam,
  parseStorefrontProductSortParam,
  parseTagSearchParam,
  serializeTagSearchParam,
  storefrontProductSort,
} from '@/lib/storefront-product-filters';
import { cn } from '@/lib/utils';

interface IProductsPageClientProps {
  availableTags: ITag[];
  basePath?: string;
  headingDescription?: string;
  headingTitle?: string;
  initialCollection?: string;
  initialPage: IProductListPage | null;
  initialSort: storefrontProductSort;
  initialTags: string[];
  initialType?: productType;
}

interface IProductsResultsProps {
  hasNextPage: boolean;
  isInitialError: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  products: IProductListPage['items'];
}

function resolveProductsPageTitle(props: Pick<IProductsPageClientProps, 'headingTitle' | 'initialCollection' | 'initialSort' | 'initialType'>) {
  if (props.headingTitle) return props.headingTitle;

  if (props.initialSort === 'trending') return 'Trending Products';

  if (props.initialCollection) return formatCollectionLabel(props.initialCollection);

  switch (props.initialType) {
    case 'kuji':
      return 'Ichiban Kuji';
    case 'standard':
      return 'Anime Merchandise';
    default:
      return 'All Products';
  }
}

function ProductsResults(props: IProductsResultsProps) {
  if (props.isInitialError) {
    return (
      <div className="rounded-[28px] border border-destructive/20 bg-destructive/5 py-20 text-center">
        <p className="font-medium text-destructive">Failed to load products. Please try again.</p>
      </div>
    );
  }

  if (props.products.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-muted/30 py-20 text-center">
        <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
        {props.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {props.hasNextPage ? (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            disabled={props.isLoadingMore}
            onClick={props.onLoadMore}
          >
            {props.isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load More
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function ProductsPageClient(props: IProductsPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftType, setDraftType] = useState<productType | undefined>(props.initialType);
  const [draftTags, setDraftTags] = useState<string[]>(props.initialTags);
  const serializedSelectedTags = serializeTagSearchParam(props.initialTags);
  const serializedDraftTags = serializeTagSearchParam(draftTags);
  const backendSort = props.initialSort === 'featured' ? undefined : props.initialSort;
  const appliedFilterCount = props.initialTags.length + (props.initialType ? 1 : 0);
  const hasDraftFilters = Boolean(draftType) || draftTags.length > 0;
  const hasDraftChanges = draftType !== props.initialType || serializedDraftTags !== serializedSelectedTags;

  const productsQuery = useInfiniteQuery({
    queryKey: [
      'products',
      props.initialType ?? null,
      props.initialCollection ?? null,
      props.initialSort,
      serializedSelectedTags ?? null,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await QueryConfigs.fetchProducts({
        type: props.initialType,
        collection: props.initialCollection,
        sort: backendSort,
        tag: serializedSelectedTags,
        pageParam,
      });

      return response.data.data as IProductListPage;
    },
    enabled: props.initialPage !== null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: props.initialPage
      ? {
        pages: [props.initialPage],
        pageParams: [undefined],
      }
      : undefined,
    staleTime: 30_000,
  });

  const products = productsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const syncDraftFilters = () => {
    setDraftType(props.initialType);
    setDraftTags(props.initialTags);
  };

  const handleSearchParamReplace = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString
      ? `${props.basePath ?? '/products'}?${nextQueryString}`
      : (props.basePath ?? '/products');

    router.replace(nextUrl, { scroll: false });
  };

  const setFilterParams = (
    params: URLSearchParams,
    nextType: productType | undefined,
    nextTags: string[],
  ) => {
    if (nextType) {
      params.set('type', nextType);
    } else {
      params.delete('type');
    }

    const serializedTags = serializeTagSearchParam(nextTags);

    if (serializedTags) {
      params.set('tag', serializedTags);
    } else {
      params.delete('tag');
    }
  };

  const handleSortChange = (newSort: string | null) => {
    const normalizedSort = parseStorefrontProductSortParam(newSort ?? undefined);

    if (!normalizedSort) {
      return;
    }

    router.replace(getStorefrontSortHref({
      pathname,
      searchParams,
      sort: normalizedSort,
    }), { scroll: false });
  };

  const handleTypeChange = (newType: string | null) => {
    handleSearchParamReplace((params) => {
      const normalizedType = parseProductTypeParam(newType ?? undefined);

      if (normalizedType) {
        params.set('type', normalizedType);
      } else {
        params.delete('type');
      }
    });
  };

  const handleTagToggle = (tagSlug: string) => {
    handleSearchParamReplace((params) => {
      const normalizedTagSlug = normalizeTagSlug(tagSlug);
      const currentTags = parseTagSearchParam(params.getAll('tag'));
      const nextTags = currentTags.includes(normalizedTagSlug)
        ? currentTags.filter((value) => value !== normalizedTagSlug)
        : [...currentTags, normalizedTagSlug];
      const serializedTags = serializeTagSearchParam(nextTags);

      if (serializedTags) {
        params.set('tag', serializedTags);
      } else {
        params.delete('tag');
      }
    });
  };

  const handleClearAllFilters = () => {
    handleSearchParamReplace((params) => {
      setFilterParams(params, undefined, []);
    });
  };

  const handleDraftTypeChange = (newType: string | null) => {
    setDraftType(parseProductTypeParam(newType ?? undefined));
  };

  const handleDraftTagToggle = (tagSlug: string) => {
    const normalizedTagSlug = normalizeTagSlug(tagSlug);

    setDraftTags((currentTags) => (
      currentTags.includes(normalizedTagSlug)
        ? currentTags.filter((value) => value !== normalizedTagSlug)
        : [...currentTags, normalizedTagSlug]
    ));
  };

  const handleOpenFilters = () => {
    syncDraftFilters();
    setIsFiltersOpen(true);
  };

  const handleMobileApply = () => {
    if (hasDraftChanges) {
      handleSearchParamReplace((params) => {
        setFilterParams(params, draftType, draftTags);
      });
    }
    setIsFiltersOpen(false);
  };

  const handleMobileClear = () => {
    setDraftType(undefined);
    setDraftTags([]);
  };

  const isInitialError = props.initialPage === null || productsQuery.status === 'error';
  const isLoadingMore = productsQuery.isFetchingNextPage;
  const hasNextPage = Boolean(productsQuery.hasNextPage);

  const selectedSortLabel =
    PRODUCT_SORT_ITEMS.find((item) => item.value === props.initialSort)?.label ?? 'Featured';
  const pageTitle = resolveProductsPageTitle(props);
  const toolbarControlClassName =
    'h-11 rounded-full border-border/70 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]';

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-5 sm:mb-8 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-[2.75rem]">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <Button
            type="button"
            variant="outline"
            className={`lg:hidden ${toolbarControlClassName}`}
            onClick={handleOpenFilters}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {appliedFilterCount > 0 ? (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-foreground">
                {appliedFilterCount}
              </span>
            ) : null}
          </Button>
          <Select
            value={props.initialSort}
            onValueChange={handleSortChange}
            modal={false}
          >
            <SelectTrigger
              className={cn(
                'min-w-45 min-h-11 w-fit max-w-full justify-between gap-2 pl-4 pr-3.5',
                toolbarControlClassName,
                'hover:bg-accent/55',
              )}
              aria-label="Sort products"
            >
              <SelectValue className="pl-0 font-medium text-foreground">{selectedSortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-45 w-fit max-w-full p-1 rounded-2xl" alignItemWithTrigger={false}>
              <SelectGroup>
                {PRODUCT_SORT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden lg:block">
          <ProductFilterSidebar
            availableTags={props.availableTags}
            selectedTags={props.initialTags}
            selectedType={props.initialType}
            onClearAll={handleClearAllFilters}
            onTagToggle={handleTagToggle}
            onTypeChange={handleTypeChange}
          />
        </div>

        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isInitialError
                ? 'Catalog unavailable'
                : `${products.length} product${products.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <ProductsResults
            hasNextPage={hasNextPage}
            isInitialError={isInitialError}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => {
              void productsQuery.fetchNextPage();
            }}
            products={products}
          />
        </section>
      </div>

      <Drawer
        open={isFiltersOpen}
        // direction="bottom"
        onOpenChange={(open) => {
          if (open) {
            syncDraftFilters();
          }

          setIsFiltersOpen(open);
        }}
      >
        <DrawerContent className="mx-auto flex max-h-[86svh] w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] border-x border-t border-border/60 bg-background p-0 shadow-[0_-18px_50px_-34px_rgba(15,23,42,0.28)]">
          <DrawerHeader className="px-4 pb-2 pt-3 text-left sm:px-5">
            <div className="mx-auto pt-2">
              <DrawerTitle className="text-xl font-semibold tracking-tight">Filters</DrawerTitle>
            </div>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5">
            <FilterPanelContent
              availableTags={props.availableTags}
              selectedTags={draftTags}
              selectedType={draftType}
              onClearAll={handleMobileClear}
              onTagToggle={handleDraftTagToggle}
              onTypeChange={handleDraftTypeChange}
              variant="drawer"
            />
          </div>
          <DrawerFooter className="bg-background px-4 py-4 sm:px-5">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full"
                disabled={!hasDraftFilters}
                onClick={handleMobileClear}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="h-12 rounded-full"
                onClick={handleMobileApply}
              >
                Apply
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
