import { Suspense } from 'react';
import { ProductsGridSkeleton } from '@/components/product/products-grid-skeleton';
import SearchPageClient from '@/app/(store)/search/search-page-client';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          <ProductsGridSkeleton count={8} />
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
