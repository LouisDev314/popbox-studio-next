import type { Metadata } from 'next';
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
  return <SearchPageClient />;
}
