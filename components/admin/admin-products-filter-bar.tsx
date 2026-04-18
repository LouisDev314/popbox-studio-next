'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ADMIN_PRODUCT_SORT_ITEMS,
  ADMIN_PRODUCT_TYPE_ITEMS,
  type IAdminProductListQueryParams,
} from '@/lib/admin-product-filters';
import { getTagTypeLabel } from '@/lib/tag-types';
import { cn } from '@/lib/utils';
import type { ICollection, ITag } from '@/interfaces/product';

const FILTER_FIELD_CLASSES = 'h-11 w-full rounded-[16px] border border-[#ded5c7] bg-white px-3.5 text-sm text-[#111827] outline-none transition focus:border-[#f4c57d] focus:ring-2 focus:ring-[#f6dfb4]';

interface ITagFilterDropdownProps {
  availableTags: ITag[];
  isUnavailable: boolean;
  onClearTags: () => void;
  onToggleTag: (tagId: string) => void;
  selectedTagIds: string[];
}

function TagFilterDropdown(props: ITagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedTagSet = useMemo(() => new Set(props.selectedTagIds), [props.selectedTagIds]);
  const selectedTags = useMemo(
    () => props.availableTags
      .filter((tag) => selectedTagSet.has(tag.id))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [props.availableTags, selectedTagSet],
  );
  const groupedTags = useMemo(() => {
    const groups = new Map<string, ITag[]>();

    for (const tag of props.availableTags) {
      const currentGroup = groups.get(tag.tagType) ?? [];
      currentGroup.push(tag);
      groups.set(tag.tagType, currentGroup);
    }

    return [...groups.entries()].map(([tagType, tags]) => ({
      tagType,
      label: getTagTypeLabel(tagType),
      tags,
    }));
  }, [props.availableTags]);

  const selectedTagCount = props.selectedTagIds.length;
  const triggerLabel = selectedTags[0]?.name
    ?? (selectedTagCount > 0 ? `${selectedTagCount} tags selected` : 'All tags');

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f8577]">
        Tags
      </label>
      <button
        type="button"
        className={cn(
          FILTER_FIELD_CLASSES,
          'flex items-center justify-between gap-2.5 text-left shadow-[0_8px_18px_-18px_rgba(17,24,39,0.32)]',
          isOpen && 'border-[#f4c57d] ring-2 ring-[#f6dfb4]',
        )}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn('truncate', selectedTagCount === 0 && 'text-[#6b7280]')}>{triggerLabel}</span>
          {selectedTagCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f8f1e7] px-2 text-[11px] font-semibold text-[#8c5f1f]">
              {selectedTagCount}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[#8f8577]">
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-[20px] border border-[#e4dccf] bg-[#fffdfa] shadow-[0_24px_50px_-36px_rgba(17,24,39,0.35)] sm:min-w-[18rem]">
          <div className="flex items-start justify-between gap-3 border-b border-border/20 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Filter by tags</p>
              <p className="mt-1 text-xs text-[#6b7280]">Matches products with any selected tag.</p>
            </div>
            {selectedTagCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full border border-[#ece4d8] bg-[#f8f4eb] px-3 text-xs text-[#111827] hover:bg-[#fff7ea]"
                onClick={() => {
                  props.onClearTags();
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {props.isUnavailable ? (
            <div className="px-4 py-4 text-sm text-[#6b7280]">Tag filters are temporarily unavailable.</div>
          ) : groupedTags.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[#6b7280]">No tags available.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              {groupedTags.map((group) => (
                <div key={group.tagType} className="pb-2 last:pb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8577]">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.tags.map((tag) => {
                      const isSelected = selectedTagSet.has(tag.id);

                      return (
                        <label
                          key={tag.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-[16px] border px-3 py-2 text-sm transition-colors',
                            isSelected
                              ? 'border-[#f4d39f] bg-[#fff3df] text-[#8c5f1f]'
                              : 'border-transparent text-[#4b5563] hover:border-[#ece4d8] hover:bg-[#f8f4eb]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => props.onToggleTag(tag.id)}
                            className="sr-only"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[#111827]">{tag.name}</p>
                          </div>
                          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f8577]">
                            {getTagTypeLabel(tag.tagType)}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#8c5f1f]" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface IAdminProductsFilterBarProps {
  collections: ICollection[];
  collectionNameById: Map<string, string>;
  filters: IAdminProductListQueryParams;
  hasActiveView: boolean;
  isCollectionsError: boolean;
  isTagsError: boolean;
  onClearView: () => void;
  onClearTags: () => void;
  onCollectionChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onTagToggle: (tagId: string) => void;
  onTypeChange: (value: string) => void;
  tags: ITag[];
}

export function AdminProductsFilterBar(props: IAdminProductsFilterBarProps) {
  return (
    <div className="mt-5 rounded-[20px] border border-[#ece4d8] bg-white/80 p-3.5 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)]">
      <div className="flex flex-wrap justify-start gap-3 text-sm text-[#6b7280] sm:justify-end">
        {props.hasActiveView && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-full border border-[#ece4d8] bg-[#f8f4eb] px-3 text-xs text-[#111827] hover:bg-[#fff7ea]"
            onClick={props.onClearView}
          >
            Reset
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f8577]">
            Product Type
          </label>
          <select
            className={FILTER_FIELD_CLASSES}
            value={props.filters.type ?? 'all'}
            onChange={(event) => props.onTypeChange(event.target.value)}
          >
            {ADMIN_PRODUCT_TYPE_ITEMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f8577]">
            Collection
          </label>
          <select
            className={FILTER_FIELD_CLASSES}
            value={props.filters.collectionId ?? 'all'}
            onChange={(event) => props.onCollectionChange(event.target.value)}
          >
            {props.filters.collectionId && !props.collectionNameById.has(props.filters.collectionId) ? (
              <option value={props.filters.collectionId}>Selected collection</option>
            ) : null}
            <option value="all">All collections</option>
            {props.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        <TagFilterDropdown
          availableTags={props.tags}
          isUnavailable={props.isTagsError}
          onClearTags={props.onClearTags}
          onToggleTag={props.onTagToggle}
          selectedTagIds={props.filters.tagIds ?? []}
        />

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f8577]">
            Sort
          </label>
          <select
            className={FILTER_FIELD_CLASSES}
            value={props.filters.sort ?? 'default'}
            onChange={(event) => props.onSortChange(event.target.value)}
          >
            {ADMIN_PRODUCT_SORT_ITEMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(props.isCollectionsError || props.isTagsError) && (
        <p className="mt-3 text-xs text-muted-foreground/75">
          Some filter options are temporarily unavailable. The product list will continue to load.
        </p>
      )}
    </div>
  );
}
