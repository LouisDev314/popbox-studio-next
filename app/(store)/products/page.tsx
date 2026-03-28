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

type ProductsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: ProductsPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const rawCollection = getFirstParamValue(searchParams.collection)?.trim();
  const type = parseProductTypeParam(searchParams.type);
  const sort = parseProductSortParam(searchParams.sort);
  const collection = rawCollection ? rawCollection : undefined;

  if (sort === 'trending') {
    return {
      title: 'Trending Products',
      description: 'Browse the products trending now at PopBox Studio.',
    };
  }

  if (collection) {
    return {
      title: `${formatCollectionLabel(collection)} - PopBox Studio`,
      description: `Browse products in the ${formatCollectionLabel(collection)} collection.`,
    };
  }

  if (type === 'kuji') {
    return {
      title: 'Ichiban Kuji - PopBox Studio',
      description: 'Browse PopBox Studio Ichiban Kuji ticket releases and prize drops.',
    };
  }

  if (type === 'standard') {
    return {
      title: 'Anime Merchandise - PopBox Studio',
      description: 'Browse premium anime merchandise, figures, and collectibles.',
    };
  }

  return {
    title: 'Products - PopBox Studio',
    description: 'Browse premium anime merchandise and Ichiban Kuji collectibles.',
  };
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
