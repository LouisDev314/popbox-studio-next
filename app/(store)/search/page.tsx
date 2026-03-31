import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsGridSkeleton } from '@/components/product/products-grid-skeleton';
import SearchPageClient from '@/app/(store)/search/search-page-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Search',
  description:
    'Search PopBox Studio for anime figures, plushies, cards, collectibles, and Ichiban Kuji releases.',
  path: '/search',
  noIndex: true,
});

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
