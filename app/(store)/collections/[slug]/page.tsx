import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsPageClient from '../../products/products-page-client';
import type { ITag } from '@/interfaces/product';
import {
  getPublicCollections,
  getPublicProductsPage,
  getPublicTags,
} from '@/lib/api/public-storefront';
import {
  parseProductSortParam,
  parseProductTypeParam,
  parseTagSearchParam,
  serializeTagSearchParam,
} from '@/lib/storefront-product-filters';
import {
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

export async function generateMetadata(props: CollectionSlugPageProps): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const seoState = getCollectionListingSeoState(params.slug, searchParams);

  try {
    const collections = await getPublicCollections();
    const collection = collections.find((item) => item.slug === params.slug && item.isActive);

    if (!collection) {
      return createPageMetadata({
        title: 'Collection not found',
        description: 'The requested collection could not be found.',
        path: seoState.canonicalPath,
        noIndex: true,
      });
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
  } catch {
    return createPageMetadata({
      title: 'Collections',
      description: 'Browse collector-focused anime merchandise and collections at PopBox Studio.',
      path: seoState.canonicalPath,
      noIndex: true,
    });
  }
}

export default async function CollectionSlugPage(props: CollectionSlugPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const type = parseProductTypeParam(searchParams.type);
  const sort = parseProductSortParam(searchParams.sort) ?? 'newest';
  const selectedTags = parseTagSearchParam(searchParams.tag);
  const serializedTags = serializeTagSearchParam(selectedTags);

  const collections = await getPublicCollections();
  const collection = collections.find((item) => item.slug === params.slug && item.isActive);

  if (!collection) {
    notFound();
  }

  let initialPage = null;
  let availableTags: ITag[] = [];

  const [productsResult, tagsResult] = await Promise.allSettled([
    getPublicProductsPage({
      collection: collection.slug,
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

  return (
    <ProductsPageClient
      availableTags={availableTags}
      basePath={`/collections/${collection.slug}`}
      headingDescription={
        collection.description || `Browse products in the ${collection.name} collection.`
      }
      headingTitle={collection.name}
      initialCollection={collection.slug}
      initialPage={initialPage}
      initialSort={sort}
      initialTags={selectedTags}
      initialType={type}
    />
  );
}
