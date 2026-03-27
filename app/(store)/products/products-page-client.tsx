'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage, ITag, productSort, productType } from '@/interfaces/product';
import { ProductCard } from '@/components/product/product-card';
import { ProductFilterSidebar } from '@/components/product/product-filter-sidebar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatCollectionLabel,
  normalizeTagSlug,
  PRODUCT_SORT_ITEMS,
  parseProductSortParam,
  parseTagSearchParam,
  parseProductTypeParam,
  serializeTagSearchParam,
} from '@/lib/storefront-product-filters';

interface IProductsPageClientProps {
  availableTags: ITag[];
  basePath?: string;
  headingDescription?: string;
  headingTitle?: string;
  initialCollection?: string;
  initialPage: IProductListPage | null;
  initialSort: productSort;
  initialTags: string[];
  initialType?: productType;
}

export default function ProductsPageClient(props: IProductsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serializedSelectedTags = serializeTagSearchParam(props.initialTags);

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
        sort: props.initialSort,
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

  const handleSearchParamReplace = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString
      ? `${props.basePath ?? '/products'}?${nextQueryString}`
      : (props.basePath ?? '/products');

    router.replace(nextUrl, { scroll: false });
  };

  const handleSortChange = (newSort: string | null) => {
    const normalizedSort = parseProductSortParam(newSort ?? undefined);

    if (!normalizedSort) {
      return;
    }

    handleSearchParamReplace((params) => {
      params.set('sort', normalizedSort);
    });
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
      params.delete('tag');
      params.delete('type');
    });
  };

  const isInitialError = props.initialPage === null || productsQuery.status === 'error';
  const isLoadingMore = productsQuery.isFetchingNextPage;
  const hasNextPage = Boolean(productsQuery.hasNextPage);

  const selectedSortLabel =
    PRODUCT_SORT_ITEMS.find((item) => item.value === props.initialSort)?.label ?? 'Newest';

  const pageTitle = () => {
    if (props.headingTitle) return props.headingTitle;

    if (props.initialCollection) return formatCollectionLabel(props.initialCollection);

    switch (props.initialType) {
      case 'kuji':
        return 'Ichiban Kuji';
      case 'standard':
        return 'Anime Merchandise';
      default:
        return 'All Products';
    }
  };

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-5 sm:mb-8 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-[2.75rem]">
            {pageTitle()}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {props.headingDescription ?? (props.initialType === 'kuji'
              ? 'Test your luck with premium prizes.'
              : 'Browse our premium collection.')}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <Select
            value={props.initialSort}
            onValueChange={handleSortChange}
            modal={false}
          >
            <SelectTrigger
              className="min-h-11 min-w-[190px] rounded-full border-border/80 bg-background/90"
              aria-label="Sort products"
            >
              <SelectValue>{selectedSortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
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
        <ProductFilterSidebar
          availableTags={props.availableTags}
          selectedTags={props.initialTags}
          selectedType={props.initialType}
          onClearAll={handleClearAllFilters}
          onTagToggle={handleTagToggle}
          onTypeChange={handleTypeChange}
        />

        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isInitialError
                ? 'Catalog unavailable'
                : `${products.length} product${products.length === 1 ? '' : 's'} shown`}
            </p>
          </div>

          {isInitialError ? (
            <div className="rounded-[28px] border border-destructive/20 bg-destructive/5 py-20 text-center">
              <p className="font-medium text-destructive">Failed to load products. Please try again.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-border bg-muted/30 py-20 text-center">
              <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-4 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {hasNextPage ? (
                <div className="mt-12 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={isLoadingMore}
                    onClick={() => {
                      void productsQuery.fetchNextPage();
                    }}
                  >
                    {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load More
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
