'use client';

import { type ChangeEvent, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage, productSort } from '@/interfaces/product';
import { ProductCard } from '@/components/product/product-card';
import { ProductsGridSkeleton } from '@/components/product/products-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const typeParam = searchParams.get('type') as 'standard' | 'kuji' | undefined;
  const collectionParam = searchParams.get('collection') ?? undefined;
  const sortParam = (searchParams.get('sort') ?? 'newest') as productSort;

  const productsQuery = useInfiniteQuery({
    queryKey: ['products', typeParam ?? null, collectionParam ?? null, sortParam],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await QueryConfigs.fetchProducts({
        type: typeParam,
        collection: collectionParam,
        sort: sortParam,
        pageParam,
      });

      return response.data.data as IProductListPage;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const products = useMemo(() => {
    return productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [productsQuery.data]);

  const handleSearchParamReplace = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `?${nextQueryString}` : '/products';

    router.replace(nextUrl, { scroll: false });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    handleSearchParamReplace((params) => {
      params.set('sort', event.target.value);
    });
  };

  const handleTypeChange = (newType: string | null) => {
    handleSearchParamReplace((params) => {
      if (newType) {
        params.set('type', newType);
      } else {
        params.delete('type');
      }
    });
  };

  const isInitialLoading = productsQuery.status === 'pending';
  const isInitialError = productsQuery.status === 'error';
  const isLoadingMore = productsQuery.isFetchingNextPage;
  const hasNextPage = Boolean(productsQuery.hasNextPage);

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {typeParam === 'kuji' ? 'Ichiban Kuji' : 'All Products'}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {typeParam === 'kuji'
              ? 'Test your luck with premium prizes.'
              : 'Browse our premium collection.'}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={typeParam ?? ''}
            onChange={(event) => handleTypeChange(event.target.value || null)}
            aria-label="Filter by product type"
          >
            <option value="">All Types</option>
            <option value="standard">Standard</option>
            <option value="kuji">Ichiban Kuji</option>
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={sortParam}
            onChange={handleSortChange}
            aria-label="Sort products"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {isInitialLoading ? (
        <ProductsGridSkeleton count={8} />
      ) : isInitialError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 py-20 text-center">
          <p className="font-medium text-destructive">Failed to load products. Please try again.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
