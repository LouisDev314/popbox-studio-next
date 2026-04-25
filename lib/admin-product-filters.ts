import type { IAdminProductListItem, productStatus, productType } from '@/interfaces/product';

type SearchParamValue = string | string[] | undefined;

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_ADMIN_PRODUCT_SORTS = [
  'updated_desc',
  'updated_asc',
  'inventory_desc',
  'inventory_asc',
] as const;
export type adminProductSort = (typeof VALID_ADMIN_PRODUCT_SORTS)[number];

export interface IAdminProductListQueryParams {
  status?: productStatus;
  type?: productType;
  collectionId?: string;
  tagIds?: string[];
  sort?: adminProductSort;
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
  { label: 'Default order', value: 'default' },
  { label: 'Updated: Newest first', value: 'updated_desc' },
  { label: 'Updated: Oldest first', value: 'updated_asc' },
  { label: 'Inventory: High to low', value: 'inventory_desc' },
  { label: 'Inventory: Low to high', value: 'inventory_asc' },
] as const;

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

export function parseAdminTagIdsParam(value: SearchParamValue): string[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      rawValues
        .flatMap((entry) => entry.split(','))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function serializeAdminTagIdsParam(values: string[]): string | undefined {
  const normalizedValues = Array.from(
    new Set(values.map((entry) => entry.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  return normalizedValues.length > 0 ? normalizedValues.join(',') : undefined;
}

export function parseAdminProductStatusParam(value: SearchParamValue): productStatus | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue === 'draft' || normalizedValue === 'active' || normalizedValue === 'archived') {
    return normalizedValue;
  }

  return undefined;
}

export function buildAdminProductListQueryParams(
  filters: IAdminProductListQueryParams,
): IAdminProductListQueryParams {
  return {
    status: filters.status,
    type: filters.type,
    collectionId: filters.collectionId,
    tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
    sort: filters.sort,
  };
}

export function buildAdminProductsQueryKey(filters: IAdminProductListQueryParams) {
  return [
    'admin',
    'products',
    filters.status ?? 'all',
    filters.type ?? 'all',
    filters.collectionId ?? 'all',
    serializeAdminTagIdsParam(filters.tagIds ?? []) ?? 'all',
    filters.sort ?? 'default',
  ] as const;
}

export function hasActiveAdminProductRefinements(filters: IAdminProductListQueryParams): boolean {
  return Boolean(
    filters.type
    || filters.collectionId
    || (filters.tagIds && filters.tagIds.length > 0)
    || filters.sort,
  );
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
