import type { Metadata } from 'next';
import ProductsPageClient from './products-page-client';
import type { ITag } from '@/interfaces/product';
import { getPublicProductsPage, getPublicTags } from '@/lib/api/public-storefront';
import {
  formatCollectionLabel,
  getFirstParamValue,
  parseProductTypeParam,
  parseProductSortParam,
  parseTagSearchParam,
  serializeTagSearchParam,
} from '@/lib/storefront-product-filters';
import {
  createPageMetadata,
  getProductsListingSeoState,
  truncateMetaDescription,
} from '@/lib/seo';

type ProductsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: ProductsPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const seoState = getProductsListingSeoState(searchParams);
  const sort = parseProductSortParam(searchParams.sort);
  const collection = seoState.collection;
  const type = seoState.type;
  const noIndex = !seoState.shouldIndex;

  if (sort === 'trending') {
    return createPageMetadata({
      title: 'Trending products',
      description: truncateMetaDescription(
        'Browse the products trending now at PopBox Studio, then keep shopping our wider anime merchandise and collectible catalog.',
        165,
      ),
      path: seoState.canonicalPath,
      noIndex,
    });
  }

  if (collection) {
    return createPageMetadata({
      title: `${formatCollectionLabel(collection)} collection`,
      description: truncateMetaDescription(
        `Browse products in the ${formatCollectionLabel(collection)} collection at PopBox Studio.`,
        165,
      ),
      path: seoState.canonicalPath,
      noIndex,
    });
  }

  if (type === 'kuji') {
    return createPageMetadata({
      title: 'Ichiban Kuji',
      description: truncateMetaDescription(
        'Shop Ichiban Kuji online at PopBox Studio. Browse collector-focused ticket drops, prize-driven releases, and anime collectibles.',
        165,
      ),
      path: seoState.canonicalPath,
      noIndex,
    });
  }

  if (type === 'standard') {
    return createPageMetadata({
      title: 'Anime merchandise',
      description: truncateMetaDescription(
        'Shop anime merchandise, figures, plushies, cards, gifts, and display-worthy collectibles from PopBox Studio.',
        165,
      ),
      path: seoState.canonicalPath,
      noIndex,
    });
  }

  return createPageMetadata({
    title: 'Products',
    description: truncateMetaDescription(
      'Shop anime merchandise, anime collectibles, figures, plushies, cards, gifts, and Ichiban Kuji online at PopBox Studio.',
      165,
    ),
    path: seoState.canonicalPath,
    noIndex,
  });
}

export default async function ProductsPage(props: ProductsPageProps) {
  const searchParams = await props.searchParams;
  const rawCollection = getFirstParamValue(searchParams.collection)?.trim();
  const type = parseProductTypeParam(searchParams.type);
  const sort = parseProductSortParam(searchParams.sort) ?? 'newest';
  const collection = rawCollection ? rawCollection : undefined;
  const selectedTags = parseTagSearchParam(searchParams.tag);
  const serializedTags = serializeTagSearchParam(selectedTags);

  let initialPage = null;
  let availableTags: ITag[] = [];

  const [productsResult, tagsResult] = await Promise.allSettled([
    getPublicProductsPage({
      collection,
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
      initialCollection={collection}
      initialPage={initialPage}
      initialSort={sort}
      initialTags={selectedTags}
      initialType={type}
    />
  );
}
