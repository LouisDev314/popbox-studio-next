'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IProductListPage, ITag, productType } from '@/interfaces/product';
import { getStorefrontSortHref } from '@/components/layout/store-navigation';
import { ProductGridDense, ProductGridDenseSkeleton } from '@/components/product/product-grid-dense';
import { FilterPanelContent } from '@/components/product/filter-panel-content';
import { ProductFilterSidebar } from '@/components/product/product-filter-sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatCollectionLabel,
  normalizeTagSlug,
  parseProductTypeParam,
  parseStorefrontProductSortParam,
  PRODUCT_SORT_ITEMS,
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
  initialCursor?: string;
  initialPage: IProductListPage | null;
  initialSort: storefrontProductSort;
  initialTags: string[];
  initialType?: productType;
}

interface IProductsResultsProps {
  isInitialError: boolean;
  products: IProductListPage['items'];
}

interface IProductsListingSectionProps extends IProductsResultsProps {
  buildPaginationHref: (nextCursorValue?: string) => string;
  hasPreviousPage: boolean;
  isRoutePending: boolean;
  nextCursor: string | null;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pendingSkeletonCount: number;
  previousCursors: string[];
}

interface IDesktopOptimisticFilters {
  baseServerTagKey: string;
  baseServerType?: productType;
  tags: string[];
  type?: productType;
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
    <ProductGridDense products={props.products} priorityCount={6} />
  );
}

function ProductsListingSection(props: IProductsListingSectionProps) {
  return (
    <section className="min-w-0" aria-busy={props.isRoutePending}>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {props.isInitialError
            ? 'Catalog unavailable'
            : `${props.products.length} product${props.products.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {props.isRoutePending ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <div className='inline-flex items-center gap-1'>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Updating...</p>
          </div>
          <ProductGridDenseSkeleton count={props.pendingSkeletonCount} className="px-0.5" />
        </div>
      ) : (
        <ProductsResults
          isInitialError={props.isInitialError}
          products={props.products}
        />
      )}

      {props.hasPreviousPage || props.nextCursor ? (
        <Pagination className="mt-12 justify-center">
          <PaginationContent>
            {props.hasPreviousPage ? (
              <PaginationItem>
                <PaginationPrevious href={props.buildPaginationHref(props.previousCursors[props.previousCursors.length - 1] || undefined)} onClick={(event) => {
                  event.preventDefault();
                  props.onPreviousPage();
                }}
                />
              </PaginationItem>
            ) : null}

            {props.nextCursor ? (
              <PaginationItem>
                <PaginationNext href={props.buildPaginationHref(props.nextCursor)} onClick={(event) => {
                  event.preventDefault();
                  props.onNextPage();
                }}
                />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}

export default function ProductsPageClient(props: IProductsPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDesktopFilterDrawer, setIsDesktopFilterDrawer] = useState(false);
  const [isRoutePending, startRouteTransition] = useTransition();
  const [desktopOptimisticFilters, setDesktopOptimisticFilters] = useState<IDesktopOptimisticFilters | null>(null);
  const [draftType, setDraftType] = useState<productType | undefined>(props.initialType);
  const [draftTags, setDraftTags] = useState<string[]>(props.initialTags);
  const [previousCursors, setPreviousCursors] = useState<string[]>([]);
  const serializedSelectedTags = serializeTagSearchParam(props.initialTags) ?? '';
  const serializedDraftTags = serializeTagSearchParam(draftTags);
  const shouldUseDesktopOptimisticFilters = desktopOptimisticFilters !== null
    && desktopOptimisticFilters.baseServerTagKey === serializedSelectedTags
    && desktopOptimisticFilters.baseServerType === props.initialType;
  const optimisticDesktopTags = shouldUseDesktopOptimisticFilters
    ? desktopOptimisticFilters.tags
    : props.initialTags;
  const optimisticDesktopType = shouldUseDesktopOptimisticFilters
    ? desktopOptimisticFilters.type
    : props.initialType;
  const appliedFilterCount = props.initialTags.length;
  const hasDraftFilters = draftTags.length > 0;
  const hasDraftChanges = draftType !== props.initialType || serializedDraftTags !== serializedSelectedTags;
  const products = props.initialPage?.items ?? [];
  const nextCursor = props.initialPage?.nextCursor ?? null;
  const hasPreviousPage = previousCursors.length > 0;
  const pendingSkeletonCount = products.length > 0 ? products.length : 12;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const syncDrawerMode = () => {
      setIsDesktopFilterDrawer(mediaQuery.matches);
    };

    syncDrawerMode();
    mediaQuery.addEventListener('change', syncDrawerMode);

    return () => {
      mediaQuery.removeEventListener('change', syncDrawerMode);
    };
  }, []);

  const syncDraftFilters = () => {
    setDraftType(props.initialType);
    setDraftTags(props.initialTags);
  };

  const handleSearchParamReplace = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.delete('cursor');
    setPreviousCursors([]);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString
      ? `${props.basePath ?? '/products'}?${nextQueryString}`
      : (props.basePath ?? '/products');

    startRouteTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const handleDesktopFilterReplace = (
    nextType: productType | undefined,
    nextTags: string[],
  ) => {
    setDesktopOptimisticFilters({
      baseServerTagKey: serializedSelectedTags,
      baseServerType: props.initialType,
      tags: nextTags,
      type: nextType,
    });

    handleSearchParamReplace((params) => {
      setFilterParams(params, nextType, nextTags);
    });
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

    setPreviousCursors([]);
    startRouteTransition(() => {
      router.replace(getStorefrontSortHref({
        pathname,
        searchParams,
        sort: normalizedSort,
      }), { scroll: false });
    });
  };

  const handleTypeChange = (newType: string | null) => {
    const nextType = parseProductTypeParam(newType ?? undefined);

    handleDesktopFilterReplace(nextType, optimisticDesktopTags);
  };

  const handleTagToggle = (tagSlug: string) => {
    const normalizedTagSlug = normalizeTagSlug(tagSlug);
    const nextTags = optimisticDesktopTags.includes(normalizedTagSlug)
      ? optimisticDesktopTags.filter((value) => value !== normalizedTagSlug)
      : [...optimisticDesktopTags, normalizedTagSlug];

    handleDesktopFilterReplace(optimisticDesktopType, nextTags);
  };

  const handleClearAllFilters = () => {
    handleDesktopFilterReplace(optimisticDesktopType, []);
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
    setDraftTags([]);
  };

  const handlePaginationNavigate = (nextCursorValue?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextCursorValue) {
      params.set('cursor', nextCursorValue);
    } else {
      params.delete('cursor');
    }

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString
      ? `${props.basePath ?? '/products'}?${nextQueryString}`
      : (props.basePath ?? '/products');

    startRouteTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const buildPaginationHref = (nextCursorValue?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextCursorValue) {
      params.set('cursor', nextCursorValue);
    } else {
      params.delete('cursor');
    }

    const nextQueryString = params.toString();
    return nextQueryString
      ? `${props.basePath ?? '/products'}?${nextQueryString}`
      : (props.basePath ?? '/products');
  };

  const handleNextPage = () => {
    if (!nextCursor) {
      return;
    }

    setPreviousCursors((current) => [...current, props.initialCursor ?? '']);
    handlePaginationNavigate(nextCursor);
  };

  const handlePreviousPage = () => {
    const previousCursor = previousCursors[previousCursors.length - 1];
    if (previousCursor === undefined) {
      return;
    }

    setPreviousCursors((current) => current.slice(0, -1));
    handlePaginationNavigate(previousCursor || undefined);
  };

  const isInitialError = props.initialPage === null;

  const selectedSortLabel =
    PRODUCT_SORT_ITEMS.find((item) => item.value === props.initialSort)?.label ?? 'Featured';
  const pageTitle = resolveProductsPageTitle(props);
  const toolbarControlClassName =
    'h-11 rounded-full border-border/70 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]';

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
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
            selectedTags={optimisticDesktopTags}
            selectedType={optimisticDesktopType}
            onClearAll={handleClearAllFilters}
            onTagToggle={handleTagToggle}
            onTypeChange={handleTypeChange}
          />
        </div>

        <ProductsListingSection
          buildPaginationHref={buildPaginationHref}
          hasPreviousPage={hasPreviousPage}
          isInitialError={isInitialError}
          isRoutePending={isRoutePending}
          nextCursor={nextCursor}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          pendingSkeletonCount={pendingSkeletonCount}
          previousCursors={previousCursors}
          products={products}
        />
      </div>

      <Drawer
        open={isFiltersOpen}
        direction={isDesktopFilterDrawer ? 'left' : 'bottom'}
        onOpenChange={(open) => {
          if (open) {
            syncDraftFilters();
          }

          setIsFiltersOpen(open);
        }}
      >
        <DrawerContent
          className={cn(
            'flex flex-col overflow-hidden overscroll-none bg-background p-0',
            isDesktopFilterDrawer
              ? 'h-[100svh] w-[88vw] max-w-sm rounded-none border-r border-border/70 shadow-[20px_0_48px_-30px_rgba(15,23,42,0.35)]'
              : 'h-[100svh] w-full rounded-t-[32px] border-t border-border/70 shadow-[0_-18px_50px_-34px_rgba(15,23,42,0.28)]',
          )}
        >
          <DrawerHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-5">
            <DrawerTitle className="text-xl font-semibold tracking-tight">Filters</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
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
          <DrawerFooter
            className="border-t border-border/70 bg-background/98 px-4 py-4 supports-backdrop-filter:backdrop-blur sm:px-5"
            style={{
              paddingBottom: isDesktopFilterDrawer
                ? '1rem'
                : 'max(env(safe-area-inset-bottom, 0px), 1rem)',
            }}
          >
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
