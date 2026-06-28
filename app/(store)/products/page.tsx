import type { Metadata } from 'next';
import ProductsPageClient from './products-page-client';
import type { ITag } from '@/interfaces/product';
import { getPublicProductsPage, getPublicTags } from '@/lib/api/public-storefront';
import {
  formatCollectionLabel,
  getFirstParamValue,
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
  const cursor = getFirstParamValue(searchParams.cursor)?.trim() || undefined;
  const type = parseProductTypeParam(searchParams.type);
  const sort = parseProductSortParam(searchParams.sort);
  const storefrontSort: storefrontProductSort = sort ?? 'newest';
  const collection = rawCollection ? rawCollection : undefined;
  const seoState = getProductsListingSeoState(searchParams);
  const selectedTags = parseTagSearchParam(searchParams.tag);
  const serializedTags = serializeTagSearchParam(selectedTags);

  let initialPage = null;
  let availableTags: ITag[] = [];

  const [productsResult, tagsResult] = await Promise.allSettled([
    getPublicProductsPage({
      collection,
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

  const products = initialPage?.items ?? [];
  const listingLabel = type === 'kuji'
    ? 'Ichiban Kuji'
    : type === 'standard'
      ? 'Anime merchandise'
      : 'Products';
  const listingJsonLd = seoState.shouldIndex && products.length > 0
    ? [
      buildBreadcrumbListJsonLd([
        { name: 'Home', path: '/' },
        { name: listingLabel, path: seoState.canonicalPath },
      ]),
      buildProductItemListJsonLd(products, seoState.canonicalPath),
    ]
    : null;

  return (
    <>
      {listingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
        />
      ) : null}
      <ProductsPageClient
        availableTags={availableTags}
        initialCollection={collection}
        initialCursor={cursor}
        initialPage={initialPage}
        initialSort={storefrontSort}
        initialTags={selectedTags}
        initialType={type}
      />
    </>
  );
}
