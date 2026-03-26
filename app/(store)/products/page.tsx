import type { Metadata } from 'next';
import ProductsPageClient from './products-page-client';
import type { productSort, productType } from '@/interfaces/product';
import { getPublicProductsPage } from '@/lib/api/public-storefront';

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const satisfies readonly productSort[];

type ProductsPageProps = {
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

function formatCollectionLabel(collection: string) {
  return collection
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export async function generateMetadata(props: ProductsPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const rawType = getFirstParamValue(searchParams.type);
  const rawCollection = getFirstParamValue(searchParams.collection)?.trim();
  const type = isProductType(rawType) ? rawType : undefined;
  const collection = rawCollection ? rawCollection : undefined;

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
  const rawType = getFirstParamValue(searchParams.type);
  const rawSort = getFirstParamValue(searchParams.sort);
  const rawCollection = getFirstParamValue(searchParams.collection)?.trim();
  const type = isProductType(rawType) ? rawType : undefined;
  const sort = isProductSort(rawSort) ? rawSort : 'newest';
  const collection = rawCollection ? rawCollection : undefined;

  let initialPage = null;

  try {
    initialPage = await getPublicProductsPage({
      collection,
      sort,
      type,
    });
  } catch {
    initialPage = null;
  }

  return (
    <ProductsPageClient
      initialCollection={collection}
      initialPage={initialPage}
      initialSort={sort}
      initialType={type}
    />
  );
}
