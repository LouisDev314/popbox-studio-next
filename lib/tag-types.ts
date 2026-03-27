export enum TagType {
  BRAND = 'brand',
  SERIES = 'series',
  CATEGORY = 'category',
}

export const TAG_TYPE_OPTIONS = [
  { label: 'Brand', value: TagType.BRAND },
  { label: 'Series', value: TagType.SERIES },
  { label: 'Category', value: TagType.CATEGORY },
] as const;

export function isTagType(value: string): value is TagType {
  return TAG_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getTagTypeLabel(value: string): string {
  const matchedOption = TAG_TYPE_OPTIONS.find((option) => option.value === value);

  return matchedOption?.label ?? value;
}
