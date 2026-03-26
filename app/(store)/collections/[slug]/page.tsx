import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsPageClient from '../../products/products-page-client';
import type { productSort, productType } from '@/interfaces/product';
import {
  getPublicCollections,
  getPublicProductsPage,
} from '@/lib/api/public-storefront';

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const satisfies readonly productSort[];

type CollectionSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function getFirstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

function isProductType(value: string | undefined): value is productType {
  return value !== undefined && VALID_PRODUCT_TYPES.includes(value as productType);
}

function isProductSort(value: string | undefined): value is productSort {
  return value !== undefined && VALID_PRODUCT_SORTS.includes(value as productSort);
}

export async function generateMetadata(props: CollectionSlugPageProps): Promise<Metadata> {
  const params = await props.params;

  try {
    const collections = await getPublicCollections();
    const collection = collections.find((item) => item.slug === params.slug && item.isActive);

    if (!collection) {
      return { title: 'Collection Not Found - PopBox Studio' };
    }

    return {
      title: `${collection.name} - PopBox Studio`,
      description: collection.description || `Browse products in the ${collection.name} collection.`,
    };
  } catch {
    return {
      title: 'Collections - PopBox Studio',
    };
  }
}

export default async function CollectionSlugPage(props: CollectionSlugPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const rawType = getFirstParamValue(searchParams.type);
  const rawSort = getFirstParamValue(searchParams.sort);
  const type = isProductType(rawType) ? rawType : undefined;
  const sort = isProductSort(rawSort) ? rawSort : 'newest';

  const collections = await getPublicCollections();
  const collection = collections.find((item) => item.slug === params.slug && item.isActive);

  if (!collection) {
    notFound();
  }

  let initialPage = null;

  try {
    initialPage = await getPublicProductsPage({
      collection: collection.slug,
      sort,
      type,
    });
  } catch {
    initialPage = null;
  }

  return (
    <ProductsPageClient
      basePath={`/collections/${collection.slug}`}
      headingDescription={
        collection.description || `Browse products in the ${collection.name} collection.`
      }
      headingTitle={collection.name}
      initialCollection={collection.slug}
      initialPage={initialPage}
      initialSort={sort}
      initialType={type}
    />
  );
}
