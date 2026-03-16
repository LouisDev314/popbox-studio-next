import { Suspense } from 'react';
import ProductsPageClient from './products-page-client';
import { ProductsGridSkeleton } from '@/components/product/products-grid-skeleton';

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          <ProductsGridSkeleton count={8} />
        </div>
      }
    >
      <ProductsPageClient />
    </Suspense>
  );
}
