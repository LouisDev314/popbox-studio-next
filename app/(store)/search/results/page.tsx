'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import QueryConfigs from '@/configs/api/query-config';
import { IProductListPage } from '@/interfaces/product';
import { Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: response, isPending, isError } = useCustomizeQuery<IProductListPage>({
    queryKey: ['search', query],
    queryFn: () => QueryConfigs.fetchSearch({ query }),
  });

  const products = response?.data?.data?.items || [];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-muted-foreground mb-8">Showing results for &quot;{query}&quot;</p>

      {isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-destructive">
          Failed to fetch search results.
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border border-dashed rounded-xl">
          <p className="text-lg text-muted-foreground">No matching products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-32 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchResultsContent />
    </React.Suspense>
  );
}
