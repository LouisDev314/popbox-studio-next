import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/product-card';
import type { IProductCard } from '@/interfaces/product';
import { getPublicSearchResults } from '@/lib/api/public-storefront';
import {
  createPageMetadata,
  truncateMetaDescription,
} from '@/lib/seo';

type SearchResultsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function normalizeQuery(query: string | string[] | undefined) {
  if (Array.isArray(query)) {
    return query[0]?.trim() ?? '';
  }

  return query?.trim() ?? '';
}

export async function generateMetadata(
  props: SearchResultsPageProps,
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const query = normalizeQuery(searchParams.q);

  return createPageMetadata({
    title: query ? `Search results for "${query}"` : 'Search results',
    description: truncateMetaDescription(
      query
        ? `Search results for "${query}" across PopBox Studio anime merchandise, anime collectibles, figures, plushies, cards, and Ichiban Kuji.`
        : 'Browse search results across PopBox Studio anime merchandise and anime collectibles.',
      165,
    ),
    path: '/search/results',
    noIndex: true,
  });
}

export default async function SearchResultsPage(props: SearchResultsPageProps) {
  const searchParams = await props.searchParams;
  const query = normalizeQuery(searchParams.q);
  let products: IProductCard[] = [];
  let isError = false;

  if (query) {
    try {
      const searchResults = await getPublicSearchResults(query);
      products = searchResults.items;
    } catch {
      isError = true;
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Search Results</h1>
      <p className="mb-8 text-muted-foreground">Showing results for &quot;{query}&quot;</p>

      {!query ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-20 text-center">
          <p className="text-lg text-muted-foreground">Enter a search term to browse products.</p>
        </div>
      ) : isError ? (
        <div className="py-20 text-center text-destructive">
          Failed to fetch search results.
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-20 text-center">
          <p className="text-lg text-muted-foreground">No matching products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
