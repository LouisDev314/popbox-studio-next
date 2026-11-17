import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { captureException } from '@sentry/nextjs';
import ProductsPageClient from '../../products/products-page-client';
import { Button } from '@/components/ui/button';
import type { ITag } from '@/interfaces/product';
import {
  getPublicCollections,
  getPublicApiErrorStatus,
  getPublicProductsPage,
  getPublicTags,
} from '@/lib/api/public-storefront';
import {
  parseProductSortParam,
  parseProductTypeParam,
  parseTagSearchParam,
  serializeTagSearchParam,
  storefrontProductSort,
} from '@/lib/storefront-product-filters';
import {
  buildBreadcrumbListJsonLd,
  buildProductItemListJsonLd,
  createPageMetadata,
  getCollectionListingSeoState,
  truncateMetaDescription,
} from '@/lib/seo';

type CollectionSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function getCollectionRetryHref(slug: string, searchParams: Awaited<CollectionSlugPageProps['searchParams']>) {
  const retrySearchParams = new URLSearchParams();

  for (const [key, values] of Object.entries(searchParams)) {
    for (const value of typeof values === 'string' ? [values] : values ?? []) {
      retrySearchParams.append(key, value);
    }
  }

  return `/collections/${encodeURIComponent(slug)}${retrySearchParams.size > 0 ? `?${retrySearchParams}` : ''}`;
}

export async function generateMetadata(props: CollectionSlugPageProps): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const seoState = getCollectionListingSeoState(params.slug, searchParams);
  let collections: Awaited<ReturnType<typeof getPublicCollections>>;

  try {
    collections = await getPublicCollections();
  } catch {
    return createPageMetadata({
      title: 'Collections',
      description: 'Browse collector-focused anime merchandise and collections at PopBox Studio.',
      path: seoState.canonicalPath,
      noIndex: true,
    });
  }

  const collection = collections.find((item) => item.slug === params.slug && item.isActive);

  if (!collection) {
    notFound();
  }

  return createPageMetadata({
    title: collection.name,
    description: truncateMetaDescription(
      collection.description || `Browse products in the ${collection.name} collection at PopBox Studio.`,
      165,
    ),
    path: seoState.canonicalPath,
    noIndex: !seoState.shouldIndex,
  });
}

export default async function CollectionSlugPage(props: CollectionSlugPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const cursorParam = searchParams.cursor;
  const cursor = Array.isArray(cursorParam) ? cursorParam[0]?.trim() || undefined : cursorParam?.trim() || undefined;
  const type = parseProductTypeParam(searchParams.type);
  const sort = parseProductSortParam(searchParams.sort);
  const selectedTags = parseTagSearchParam(searchParams.tag);
  const serializedTags = serializeTagSearchParam(selectedTags);
  const seoState = getCollectionListingSeoState(params.slug, searchParams);

  let collections: Awaited<ReturnType<typeof getPublicCollections>>;

  try {
    collections = await getPublicCollections();
  } catch (error) {
    captureException(error, {
      tags: {
        operation: 'storefront.collections',
        upstream_status: String(getPublicApiErrorStatus(error) ?? 'unknown'),
      },
    });
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-foreground">Collection temporarily unavailable</h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          We couldn’t load this collection right now. Please try again in a moment.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button asChild className="rounded-full">
            <a href={getCollectionRetryHref(params.slug, searchParams)}>Try Again</a>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }
  const collection = collections.find((item) => item.slug === params.slug && item.isActive);

  if (!collection) {
    notFound();
  }

  let initialPage = null;
  let availableTags: ITag[] = [];

  const [productsResult, tagsResult] = await Promise.allSettled([
    getPublicProductsPage({
      collection: collection.slug,
      cursor,
      sort,
      type,
      tag: serializedTags,
    }),
    getPublicTags(),
  ]);

  if (productsResult.status === 'fulfilled') {
    initialPage = productsResult.value;
  }

  if (tagsResult.status === 'fulfilled') {
    availableTags = tagsResult.value;
  }

  const storefrontSort: storefrontProductSort = collection.slug === 'featured'
    ? sort ?? 'featured'
    : sort ?? 'newest';
  const products = initialPage?.items ?? [];
  const collectionJsonLd = seoState.shouldIndex && products.length > 0
    ? [
      buildBreadcrumbListJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Collections', path: '/products' },
        { name: collection.name, path: seoState.canonicalPath },
      ]),
      buildProductItemListJsonLd(products, seoState.canonicalPath),
    ]
    : null;

  return (
    <>
      {collectionJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        />
      ) : null}
      <ProductsPageClient
        availableTags={availableTags}
        basePath={`/collections/${collection.slug}`}
        headingTitle={collection.name}
        initialCollection={collection.slug}
        initialCursor={cursor}
        initialPage={initialPage}
        initialSort={storefrontSort}
        initialTags={selectedTags}
        initialType={type}
      />
    </>
  );
}
