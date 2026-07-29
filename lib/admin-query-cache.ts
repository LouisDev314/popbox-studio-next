import type {
  IAdminProductListResponse,
  IProductCollection,
} from '@/interfaces/product';

type EntityWithId = { id: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasCollections(value: unknown): value is {
  id: string;
  collections: IProductCollection[];
} {
  return isRecord(value)
    && typeof value.id === 'string'
    && Array.isArray(value.collections)
    && value.collections.every((collection) => (
      isRecord(collection)
      && typeof collection.id === 'string'
      && typeof collection.name === 'string'
      && typeof collection.slug === 'string'
    ));
}

export function isAdminProductListPage(value: unknown): value is IAdminProductListResponse {
  return isRecord(value)
    && Array.isArray(value.items)
    && value.items.every(hasCollections)
    && (value.nextCursor === null || typeof value.nextCursor === 'string')
    && typeof value.totalCount === 'number';
}

function patchProductMembership<T extends { id: string; collections: IProductCollection[] }>(
  product: T,
  featuredCollection: IProductCollection,
  featuredProductIds: ReadonlySet<string>,
): T {
  const isFeatured = product.collections.some((collection) => collection.id === featuredCollection.id);
  const shouldBeFeatured = featuredProductIds.has(product.id);

  if (isFeatured === shouldBeFeatured) return product;

  return {
    ...product,
    collections: shouldBeFeatured
      ? [...product.collections, featuredCollection]
      : product.collections.filter((collection) => collection.id !== featuredCollection.id),
  };
}

function patchProductPage(
  page: IAdminProductListResponse,
  featuredCollection: IProductCollection,
  featuredProductIds: ReadonlySet<string>,
): IAdminProductListResponse {
  let didChange = false;
  const items = page.items.map((product) => {
    const nextProduct = patchProductMembership(product, featuredCollection, featuredProductIds);
    if (nextProduct !== product) didChange = true;
    return nextProduct;
  });

  return didChange ? { ...page, items } : page;
}

export function patchAdminProductMembershipCache(
  oldData: unknown,
  featuredCollection: IProductCollection,
  featuredProductIds: ReadonlySet<string>,
): unknown {
  if (oldData === undefined) return oldData;
  if (!isRecord(oldData)) return oldData;

  if (Array.isArray(oldData.pages) && Array.isArray(oldData.pageParams)) {
    if (!oldData.pages.every(isAdminProductListPage)) return oldData;

    let didChange = false;
    const pages = oldData.pages.map((page) => {
      const nextPage = patchProductPage(page, featuredCollection, featuredProductIds);
      if (nextPage !== page) didChange = true;
      return nextPage;
    });

    return didChange ? { ...oldData, pages } : oldData;
  }

  const axiosData = oldData.data;
  if (!isRecord(axiosData)) return oldData;
  const apiData = axiosData.data;

  if (isAdminProductListPage(apiData)) {
    const nextPage = patchProductPage(apiData, featuredCollection, featuredProductIds);
    return nextPage === apiData
      ? oldData
      : {
        ...oldData,
        data: {
          ...axiosData,
          data: nextPage,
        },
      };
  }

  if (!hasCollections(apiData)) return oldData;
  const nextProduct = patchProductMembership(apiData, featuredCollection, featuredProductIds);

  return nextProduct === apiData
    ? oldData
    : {
      ...oldData,
      data: {
        ...axiosData,
        data: nextProduct,
      },
    };
}

export function flattenUniquePages<T extends EntityWithId>(
  pages: readonly { items: readonly T[] }[] | undefined,
): T[] {
  if (!pages) return [];

  const seenIds = new Set<string>();
  const items: T[] = [];

  pages.forEach((page) => {
    page.items.forEach((item) => {
      if (seenIds.has(item.id)) return;
      seenIds.add(item.id);
      items.push(item);
    });
  });

  return items;
}

export function getProductListTotalCount(
  pages: readonly IAdminProductListResponse[] | undefined,
): number | undefined {
  return pages?.[0]?.totalCount;
}
