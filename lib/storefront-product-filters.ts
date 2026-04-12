import type { ITag, productSort, productType } from '@/interfaces/product';
import { TAG_TYPE_OPTIONS } from '@/lib/tag-types';

const VALID_PRODUCT_TYPES = ['standard', 'kuji'] as const satisfies readonly productType[];
const VALID_PRODUCT_SORTS = ['trending', 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const satisfies readonly productSort[];
const VALID_STOREFRONT_PRODUCT_SORTS = ['featured', ...VALID_PRODUCT_SORTS] as const;

export type storefrontProductSort = (typeof VALID_STOREFRONT_PRODUCT_SORTS)[number];

export const PRODUCT_TYPE_ITEMS = [
  { label: 'All Products', compactLabel: 'All', value: '' },
  { label: 'Anime Merchandise', compactLabel: 'Merch', value: 'standard' },
  { label: 'Ichiban Kuji', compactLabel: 'Kuji', value: 'kuji' },
] as const;

export const PRODUCT_SORT_ITEMS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Trending', value: 'trending' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
] as const satisfies readonly { label: string; value: storefrontProductSort }[];

type SearchParamValue = string | string[] | undefined;

export type ITagGroup = {
  key: string;
  label: string;
  tags: ITag[];
};

export function getFirstParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseProductTypeParam(value: SearchParamValue): productType | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue && VALID_PRODUCT_TYPES.includes(normalizedValue as productType)) {
    return normalizedValue as productType;
  }

  return undefined;
}

export function parseProductSortParam(value: SearchParamValue): productSort | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue && VALID_PRODUCT_SORTS.includes(normalizedValue as productSort)) {
    return normalizedValue as productSort;
  }

  return undefined;
}

export function parseStorefrontProductSortParam(value: SearchParamValue): storefrontProductSort | undefined {
  const normalizedValue = getFirstParamValue(value);

  if (normalizedValue && VALID_STOREFRONT_PRODUCT_SORTS.includes(normalizedValue as storefrontProductSort)) {
    return normalizedValue as storefrontProductSort;
  }

  return undefined;
}

export function parseTagSearchParam(value: SearchParamValue): string[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedTags = rawValues
    .flatMap((entry) => entry.split(','))
    .map(normalizeTagSlug)
    .filter(Boolean);

  return Array.from(new Set(normalizedTags));
}

export function serializeTagSearchParam(values: string[]): string | undefined {
  const normalizedValues = Array.from(
    new Set(values.map(normalizeTagSlug).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  return normalizedValues.length > 0 ? normalizedValues.join(',') : undefined;
}

function capitalizeWord(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeTagSlug(value: string) {
  return value.trim().toLowerCase();
}

export function formatCollectionLabel(collection: string) {
  return collection
    .split('-')
    .filter(Boolean)
    .map((segment) => capitalizeWord(segment))
    .join(' ');
}

export function formatTagTypeLabel(tagType: string) {
  const normalizedType = tagType.trim();
  const knownOption = TAG_TYPE_OPTIONS.find((option) => option.value === normalizedType);

  if (knownOption) {
    return knownOption.label;
  }

  if (!normalizedType) {
    return 'Other Tags';
  }

  return normalizedType
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => capitalizeWord(segment))
    .join(' ');
}

export function formatTagLabel(tagSlug: string) {
  return tagSlug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => capitalizeWord(segment))
    .join(' ');
}

export function groupTagsByType(tags: ITag[]): ITagGroup[] {
  const tagsByType = new Map<string, ITag[]>();
  const seenSlugs = new Set<string>();

  for (const tag of tags) {
    const normalizedSlug = normalizeTagSlug(tag.slug);

    if (!normalizedSlug || seenSlugs.has(normalizedSlug)) {
      continue;
    }

    seenSlugs.add(normalizedSlug);

    const key = tag.tagType.trim() || 'other';
    const currentGroup = tagsByType.get(key) ?? [];
    currentGroup.push(tag);
    tagsByType.set(key, currentGroup);
  }

  const preferredOrder: string[] = TAG_TYPE_OPTIONS.map((option) => option.value);

  return [...tagsByType.entries()]
    .sort(([leftKey], [rightKey]) => {
      const leftIndex = preferredOrder.indexOf(leftKey);
      const rightIndex = preferredOrder.indexOf(rightKey);

      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }

      return formatTagTypeLabel(leftKey).localeCompare(formatTagTypeLabel(rightKey));
    })
    .map(([key, groupTags]) => ({
      key,
      label: key === 'other' ? 'Other Tags' : formatTagTypeLabel(key),
      tags: [...groupTags].sort((left, right) => left.name.localeCompare(right.name)),
    }));
}
