'use client';

import { Button } from '@/components/ui/button';
import { AdminFilterSelect } from '@/components/admin/admin-filter-select';
import {
  ADMIN_PRODUCT_SORT_ITEMS,
  ADMIN_PRODUCT_TYPE_ITEMS,
  type IAdminProductListQueryParams,
} from '@/lib/admin-product-filters';
import { getTagTypeLabel } from '@/lib/tag-types';
import type { ICollection, ITag } from '@/interfaces/product';

interface IAdminProductsFilterBarProps {
  collections: ICollection[];
  collectionNameById: Map<string, string>;
  filters: IAdminProductListQueryParams;
  hasActiveView: boolean;
  isCollectionsError: boolean;
  isCollectionsLoading: boolean;
  isTagsError: boolean;
  isTagsLoading: boolean;
  onClearView: () => void;
  onCollectionChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onTagChange: (tagId: string) => void;
  onTypeChange: (value: string) => void;
  tags: ITag[];
}

export function AdminProductsFilterBar(props: IAdminProductsFilterBarProps) {
  const collectionOptions = [
    ...(props.filters.collectionId !== 'all' && !props.collectionNameById.has(props.filters.collectionId)
      ? [{ label: 'Selected collection', value: props.filters.collectionId }]
      : []),
    { label: props.isCollectionsLoading ? 'Loading collections...' : 'All collections', value: 'all' },
    ...props.collections.map((collection) => ({
      label: collection.name,
      value: collection.id,
    })),
  ];
  const tagOptions = [
    ...(props.filters.tagId !== 'all' && !props.tags.some((tag) => tag.id === props.filters.tagId)
      ? [{ label: 'Selected tag', value: props.filters.tagId }]
      : []),
    { label: props.isTagsLoading ? 'Loading tags...' : 'All tags', value: 'all' },
    ...props.tags.map((tag) => ({
      label: `${tag.name} (${getTagTypeLabel(tag.tagType)})`,
      value: tag.id,
    })),
  ];

  return (
    <div className="mt-5 rounded-[20px] border border-[#ece4d8] bg-white/80 p-3.5 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)]">
      <div className="flex flex-wrap justify-start gap-3 text-sm text-[#6b7280] sm:justify-end">
        {props.hasActiveView ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-full border border-[#ece4d8] bg-[#f8f4eb] px-3 text-xs text-[#111827] hover:bg-accent/70"
            onClick={props.onClearView}
          >
            Reset
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <AdminFilterSelect
          id="admin-product-type-filter"
          label="Product Type"
          onChange={props.onTypeChange}
          options={ADMIN_PRODUCT_TYPE_ITEMS}
          value={props.filters.productType}
        />

        <AdminFilterSelect
          id="admin-product-collection-filter"
          label="Collection"
          disabled={props.isCollectionsLoading}
          onChange={props.onCollectionChange}
          options={collectionOptions}
          value={props.filters.collectionId}
        />

        <AdminFilterSelect
          id="admin-product-tag-filter"
          label="Tag"
          disabled={props.isTagsLoading}
          onChange={props.onTagChange}
          options={tagOptions}
          value={props.filters.tagId}
        />

        <AdminFilterSelect
          id="admin-product-sort-filter"
          label="Sort"
          onChange={props.onSortChange}
          options={ADMIN_PRODUCT_SORT_ITEMS}
          value={props.filters.sort}
        />
      </div>

      {(props.isCollectionsError || props.isTagsError) ? (
        <p className="mt-3 text-xs text-muted-foreground/75">
          Some filter options are temporarily unavailable. The product list will continue to load.
        </p>
      ) : null}
    </div>
  );
}
