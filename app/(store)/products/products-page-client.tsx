'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage, productSort, productType } from '@/interfaces/product';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const satisfies readonly productSort[];

const PRODUCT_TYPE_ITEMS = [
  { label: 'All Products', value: '' },
  { label: 'Anime Merchandise', value: 'standard' },
  { label: 'Ichiban Kuji', value: 'kuji' },
] as const;

const PRODUCT_SORT_ITEMS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
] as const satisfies readonly { label: string; value: productSort }[];

function isProductType(value: string | null): value is productType {
  return value !== null && VALID_PRODUCT_TYPES.includes(value as productType);
}

function isProductSort(value: string | null): value is productSort {
  return value !== null && VALID_PRODUCT_SORTS.includes(value as productSort);
}

function formatCollectionLabel(collection: string) {
  return collection
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

interface IProductsPageClientProps {
  basePath?: string;
  headingDescription?: string;
  headingTitle?: string;
  initialCollection?: string;
  initialPage: IProductListPage | null;
  initialSort: productSort;
  initialType?: productType;
}

export default function ProductsPageClient(props: IProductsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productsQuery = useInfiniteQuery({
    queryKey: ['products', props.initialType ?? null, props.initialCollection ?? null, props.initialSort],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await QueryConfigs.fetchProducts({
        type: props.initialType,
        collection: props.initialCollection,
        sort: props.initialSort,
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
    if (!isProductSort(newSort)) {
      return;
    }

    handleSearchParamReplace((params) => {
      params.set('sort', newSort);
    });
  };

  const handleTypeChange = (newType: string | null) => {
    handleSearchParamReplace((params) => {
      if (isProductType(newType)) {
        params.set('type', newType);
      } else {
        params.delete('type');
      }
    });
  };

  const isInitialError = props.initialPage === null || productsQuery.status === 'error';
  const isLoadingMore = productsQuery.isFetchingNextPage;
  const hasNextPage = Boolean(productsQuery.hasNextPage);

  const selectedProductTypeLabel =
    PRODUCT_TYPE_ITEMS.find((item) => item.value === (props.initialType ?? ''))?.label ?? 'All Types';

  const selectedSortLabel =
    PRODUCT_SORT_ITEMS.find((item) => item.value === props.initialSort)?.label ?? 'Newest';

  const pageTitle = () => {
    if (props.headingTitle) return props.headingTitle;

    if (props.initialCollection) return formatCollectionLabel(props.initialCollection);

    switch (props.initialType) {
      case 'kuji':
        return 'Ichiban Kuji'
      case 'standard':
        return 'Anime Merchandise'
      default:
        return 'All Products'
    }
  }

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {pageTitle()}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {props.headingDescription ?? (props.initialType === 'kuji'
              ? 'Test your luck with premium prizes.'
              : 'Browse our premium collection.')}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Select
            value={props.initialType ?? ''}
            onValueChange={handleTypeChange}
            modal={false}
          >
            <SelectTrigger className="min-w-45 min-h-10" aria-label="Filter by product type">
              <SelectValue className='text-[#1B181A]'>{selectedProductTypeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {PRODUCT_TYPE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={props.initialSort}
            onValueChange={handleSortChange}
            modal={false}
          >
            <SelectTrigger className="min-w-[180px] min-h-[40px]" aria-label="Sort products">
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

      {isInitialError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 py-20 text-center">
          <p className="font-medium text-destructive">Failed to load products. Please try again.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-4">
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
    </div>
  );
}
