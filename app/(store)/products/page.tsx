'use client';

import { Suspense, type ChangeEvent, useState } from 'react';
import useCustomizeQuery from '@/hooks/use-customize-query';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage, productSort } from '@/interfaces/product';
import { ProductCard } from '@/components/product/product-card';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const typeParam = searchParams.get('type') as 'standard' | 'kuji' | undefined;
  const collectionParam = searchParams.get('collection') ?? undefined;
  const sortParam = searchParams.get('sort') ?? 'newest';
  
  // Basic infinite scroll placeholder state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<IProductListPage['items']>([]);

  const { data: response, isPending, isError } = useCustomizeQuery<IProductListPage>({
    queryKey: ['products', typeParam, collectionParam, sortParam, cursor],
    queryFn: () => QueryConfigs.fetchProducts({
      type: typeParam,
      collection: collectionParam,
      sort: sortParam as productSort,
      pageParam: cursor,
    }),
    onSuccess: (queryResponse) => {
      const items = queryResponse.data.data.items;

      setAllProducts((prev) => (cursor ? [...prev, ...items] : items));
    },
  });

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    setCursor(undefined);
    router.push(`?${params.toString()}`);
  };

  const handleTypeChange = (newType: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newType) params.set('type', newType);
    else params.delete('type');
    setCursor(undefined);
    router.push(`?${params.toString()}`);
  }

  const nextCursor = response?.data?.data?.nextCursor;
  const hasNextPage = nextCursor !== null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {typeParam === 'kuji' ? 'Ichiban Kuji' : 'All Products'}
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">
            {typeParam === 'kuji' ? 'Test your luck with premium prizes.' : 'Browse our premium collection.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={typeParam || ''}
            onChange={(e) => handleTypeChange(e.target.value || null)}
          >
            <option value="">All Types</option>
            <option value="standard">Standard</option>
            <option value="kuji">Ichiban Kuji</option>
          </select>

          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={sortParam}
            onChange={handleSortChange}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {isPending && !allProducts.length ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-destructive font-medium">
          Failed to load products. Please try again.
        </div>
      ) : allProducts.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allProducts.map((product) => (
              <ProductCard key={`${product.id}-${cursor}`} product={product} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-12 flex justify-center">
              <Button 
                variant="outline" 
                size="lg" 
                disabled={isPending}
                onClick={() => {
                  if (nextCursor) setCursor(nextCursor);
                }}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-32 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
