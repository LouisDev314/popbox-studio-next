import type { IAdminProductListItem, productStatus, productType } from '@/interfaces/product';

type SearchParamValue = string | string[] | undefined;

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_ADMIN_PRODUCT_SORTS = [
  'created_desc',
  'created_asc',
  'updated_desc',
  'updated_asc',
  'price_desc',
  'price_asc',
  'name_asc',
  'name_desc',
  'inventory_desc',
  'inventory_asc',
] as const;
export type adminProductSort = (typeof VALID_ADMIN_PRODUCT_SORTS)[number];
export type AdminProductStatusFilter = productStatus | 'all';
export type AdminProductTypeFilter = productType | 'all';

export interface IAdminProductListQueryParams {
  collectionId: string;
  cursor?: string;
  limit?: number;
  productType: AdminProductTypeFilter;
  search?: string;
  sort: adminProductSort;
  status: AdminProductStatusFilter;
  tagId: string;
}

export interface IAdminProductSearchState {
  query?: string;
}

export interface IAdminProductSearchResult {
  items: IAdminProductListItem[];
}

const hasOwn = <Key extends PropertyKey>(
  value: object,
  key: Key,
): value is Record<Key, unknown> => Object.prototype.hasOwnProperty.call(value, key);

export const ADMIN_PRODUCT_STATUS_TABS: { label: string; value: productStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
] as const;

export const ADMIN_PRODUCT_TYPE_ITEMS = [
  { label: 'All types', value: 'all' },
  { label: 'Standard', value: 'standard' },
  { label: 'Kuji', value: 'kuji' },
] as const;

export const ADMIN_PRODUCT_SORT_ITEMS = [
  { label: 'Created: Newest first', value: 'created_desc' },
  { label: 'Created: Oldest first', value: 'created_asc' },
  { label: 'Updated: Newest first', value: 'updated_desc' },
  { label: 'Updated: Oldest first', value: 'updated_asc' },
  { label: 'Price: High to low', value: 'price_desc' },
  { label: 'Price: Low to high', value: 'price_asc' },
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
  { label: 'Inventory: High to low', value: 'inventory_desc' },
  { label: 'Inventory: Low to high', value: 'inventory_asc' },
] as const;

export const ADMIN_PRODUCT_DEFAULT_STATUS: AdminProductStatusFilter = 'all';
export const ADMIN_PRODUCT_DEFAULT_TYPE: AdminProductTypeFilter = 'all';
export const ADMIN_PRODUCT_DEFAULT_COLLECTION_ID = 'all';
export const ADMIN_PRODUCT_DEFAULT_TAG_ID = 'all';
export const ADMIN_PRODUCT_DEFAULT_SORT: adminProductSort = 'updated_desc';
export const ADMIN_PRODUCT_LIST_LIMIT = 25;

function getFirstParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseAdminProductTypeParam(value: SearchParamValue): productType | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue && VALID_PRODUCT_TYPES.includes(normalizedValue as productType)) {
    return normalizedValue as productType;
  }

  return undefined;
}

export function parseAdminProductSortParam(value: SearchParamValue): adminProductSort | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue && VALID_ADMIN_PRODUCT_SORTS.includes(normalizedValue as adminProductSort)) {
    return normalizedValue as adminProductSort;
  }

  return undefined;
}

export function parseAdminCollectionIdParam(value: SearchParamValue): string | undefined {
  const normalizedValue = getFirstParamValue(value)?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

export function parseAdminTagIdParam(value: SearchParamValue): string | undefined {
  const normalizedValue = getFirstParamValue(value)?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

export function parseAdminProductStatusParam(value: SearchParamValue): productStatus | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue === 'draft' || normalizedValue === 'active' || normalizedValue === 'archived') {
    return normalizedValue;
  }

  return undefined;
}

export function buildAdminProductListQueryParams(
  filters: Partial<IAdminProductListQueryParams>,
): IAdminProductListQueryParams {
  return {
    collectionId: filters.collectionId?.trim() || ADMIN_PRODUCT_DEFAULT_COLLECTION_ID,
    cursor: filters.cursor?.trim() || undefined,
    limit: filters.limit ?? ADMIN_PRODUCT_LIST_LIMIT,
    productType: filters.productType ?? ADMIN_PRODUCT_DEFAULT_TYPE,
    search: filters.search?.trim() || undefined,
    sort: filters.sort ?? ADMIN_PRODUCT_DEFAULT_SORT,
    status: filters.status ?? ADMIN_PRODUCT_DEFAULT_STATUS,
    tagId: filters.tagId?.trim() || ADMIN_PRODUCT_DEFAULT_TAG_ID,
  };
}

export function buildAdminProductsQueryScopeKey(filters: IAdminProductListQueryParams) {
  return [
    'admin',
    'products',
    filters.search ?? '',
    filters.status,
    filters.productType,
    filters.collectionId,
    filters.tagId,
    filters.sort,
  ] as const;
}

export type AdminProductsQueryScopeKey = ReturnType<typeof buildAdminProductsQueryScopeKey>;

export function isSameAdminProductsQueryScope(
  queryKey: readonly unknown[] | null | undefined,
  scopeKey: AdminProductsQueryScopeKey,
) {
  return Boolean(
    queryKey
    && scopeKey.every((value, index) => queryKey[index] === value),
  );
}

export function buildAdminProductsQueryKey(filters: IAdminProductListQueryParams) {
  return [
    ...buildAdminProductsQueryScopeKey(filters),
    filters.cursor ?? '',
    filters.limit ?? ADMIN_PRODUCT_LIST_LIMIT,
  ] as const;
}

export function hasActiveAdminProductRefinements(filters: IAdminProductListQueryParams): boolean {
  return Boolean(
    filters.status !== ADMIN_PRODUCT_DEFAULT_STATUS
    || filters.productType !== ADMIN_PRODUCT_DEFAULT_TYPE
    || filters.collectionId !== ADMIN_PRODUCT_DEFAULT_COLLECTION_ID
    || filters.tagId !== ADMIN_PRODUCT_DEFAULT_TAG_ID
    || filters.sort !== ADMIN_PRODUCT_DEFAULT_SORT
    || Boolean(filters.search),
  );
}

export function buildAdminProductsRequestParams(filters: IAdminProductListQueryParams) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    status: filters.status,
    productType: filters.productType,
    collectionId: filters.collectionId,
    tagId: filters.tagId,
    sort: filters.sort,
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    limit: filters.limit ?? ADMIN_PRODUCT_LIST_LIMIT,
  };
}

function getAdminProductSearchFields(
  product: IAdminProductListItem,
): string[] {
  const productRecord = product as unknown as Record<string, unknown>;
  const collectionNames = hasOwn(productRecord, 'collections') && Array.isArray(product.collections)
    ? product.collections.map((collection) => collection.name)
    : [];
  const tagNames = Array.isArray(productRecord.tags)
    ? product.tags.map((tag) => tag.name)
    : [];

  return [
    product.name,
    product.slug,
    product.sku ?? '',
    ...collectionNames,
    ...tagNames,
  ].filter(Boolean);
}

function matchesAdminProductTextSearch(
  product: IAdminProductListItem,
  normalizedQuery: string,
) {
  return getAdminProductSearchFields(product).some((field) => (
    field.toLocaleLowerCase().includes(normalizedQuery)
  ));
}

export function filterAdminProductsBySearch(
  products: IAdminProductListItem[],
  searchState: IAdminProductSearchState,
): IAdminProductSearchResult {
  const query = searchState.query?.trim();

  if (!query) {
    return {
      items: products,
    };
  }

  return {
    items: products.filter((product) => (
      matchesAdminProductTextSearch(product, query.toLocaleLowerCase())
    )),
  };
}
