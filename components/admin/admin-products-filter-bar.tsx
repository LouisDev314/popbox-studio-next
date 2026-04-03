'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ADMIN_PRODUCT_SORT_ITEMS,
  ADMIN_PRODUCT_TYPE_ITEMS,
  type IAdminProductListQueryParams,
} from '@/lib/admin-product-filters';
import { getTagTypeLabel } from '@/lib/tag-types';
import { cn } from '@/lib/utils';
import type { ICollection, ITag } from '@/interfaces/product';

const FILTER_FIELD_CLASSES = 'h-9 w-full rounded-lg border border-border/30 bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10';

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
    () => props.availableTags.filter((tag) => selectedTagSet.has(tag.id)),
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
  const triggerLabel = (() => {
    if (selectedTagCount === 0) {
      return 'All tags';
    }

    if (selectedTags.length === 0) {
      return `${selectedTagCount} tag${selectedTagCount === 1 ? '' : 's'} selected`;
    }

    if (selectedTags.length === 1) {
      return selectedTags[0].name;
    }

    return `${selectedTags[0].name} +${selectedTagCount - 1}`;
  })();

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        Tags
      </label>
      <button
        type="button"
        className={cn(
          FILTER_FIELD_CLASSES,
          'flex items-center justify-between gap-3 text-left',
          isOpen && 'border-primary/40 ring-2 ring-primary/10',
        )}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedTagCount > 0 ? (
            <span className="rounded-full bg-[#F7F4F6] px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {selectedTagCount}
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground/70 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[280px] rounded-xl border border-border/30 bg-card shadow-[0_20px_40px_-24px_rgba(25,28,30,0.2)]">
          <div className="flex items-start justify-between gap-3 border-b border-border/20 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Filter by tags</p>
              <p className="mt-1 text-xs text-muted-foreground/75">Matches any selected tag.</p>
            </div>
            {selectedTagCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-md px-2.5 text-xs"
                onClick={() => {
                  props.onClearTags();
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>

          {props.isUnavailable ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Tag filters are temporarily unavailable.</div>
          ) : groupedTags.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">No tags available.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {groupedTags.map((group) => (
                <div key={group.tagType} className="pb-2 last:pb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/65">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.tags.map((tag) => {
                      const isSelected = selectedTagSet.has(tag.id);

                      return (
                        <label
                          key={tag.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                            isSelected
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-transparent text-muted-foreground hover:border-border/40 hover:bg-[#F7F4F6]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => props.onToggleTag(tag.id)}
                            className="sr-only"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{tag.name}</p>
                          </div>
                          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                            {getTagTypeLabel(tag.tagType)}
                          </span>
                          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface IAdminProductsFilterBarProps {
  collections: ICollection[];
  collectionNameById: Map<string, string>;
  filters: IAdminProductListQueryParams;
  hasActiveRefinements: boolean;
  isCollectionsError: boolean;
  isPending: boolean;
  isTagsError: boolean;
  onClearRefinements: () => void;
  onClearTags: () => void;
  onCollectionChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onTagToggle: (tagId: string) => void;
  onTypeChange: (value: string) => void;
  productsCount: number;
  tags: ITag[];
}

export function AdminProductsFilterBar(props: IAdminProductsFilterBarProps) {
  return (
    <div className="mt-6 rounded-xl border border-border/30 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
              Refine Catalog
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by type, collection, and tags, then sort for quicker catalog review.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{props.isPending ? 'Loading products...' : `${props.productsCount} shown`}</span>
          {props.hasActiveRefinements ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2.5"
              onClick={props.onClearRefinements}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
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
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
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
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
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

      {props.isCollectionsError || props.isTagsError ? (
        <p className="mt-3 text-xs text-muted-foreground/75">
          Some filter options are temporarily unavailable. The product list will continue to load.
        </p>
      ) : null}
    </div>
  );
}
