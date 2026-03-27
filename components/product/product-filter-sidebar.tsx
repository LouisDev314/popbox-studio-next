'use client';

import { Filter, X } from 'lucide-react';
import type { ITag, productType } from '@/interfaces/product';
import {
  formatTagLabel,
  groupTagsByType,
  normalizeTagSlug,
  PRODUCT_TYPE_ITEMS,
} from '@/lib/storefront-product-filters';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface IProductFilterSidebarProps {
  availableTags: ITag[];
  selectedTags: string[];
  selectedType?: productType;
  onClearAll: () => void;
  onTagToggle: (tagSlug: string) => void;
  onTypeChange: (value: string) => void;
}

type IFilterOptionButtonProps = {
  isSelected: boolean;
  label: string;
  onClick: () => void;
};

function FilterOptionButton(props: IFilterOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        props.isSelected
          ? 'border-foreground/10 bg-card text-foreground shadow-sm'
          : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground',
      )}
    >
      <span>{props.label}</span>
      <span
        className={cn(
          'size-2.5 rounded-full transition-colors',
          props.isSelected ? 'bg-foreground' : 'bg-border',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

type ITagCheckboxRowProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

function TagCheckboxRow(props: ITagCheckboxRowProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-colors',
        props.checked
          ? 'border-foreground/10 bg-card text-foreground shadow-sm'
          : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground',
      )}
    >
      <input
        type="checkbox"
        checked={props.checked}
        onChange={props.onChange}
        className="mt-0.5 size-4 rounded border-input bg-background accent-[hsl(var(--foreground))] focus:ring-2 focus:ring-ring/60"
      />
      <span className="min-w-0 leading-snug">{props.label}</span>
    </label>
  );
}

export function ProductFilterSidebar(props: IProductFilterSidebarProps) {
  const tagGroups = groupTagsByType(props.availableTags);
  const selectedTagSet = new Set(props.selectedTags.map(normalizeTagSlug));
  const tagLookup = new Map(props.availableTags.map((tag) => [normalizeTagSlug(tag.slug), tag]));
  const selectedTagItems = props.selectedTags.map((tagSlug) => ({
    slug: tagSlug,
    label: tagLookup.get(normalizeTagSlug(tagSlug))?.name ?? formatTagLabel(tagSlug),
  }));
  const hasActiveFilters = Boolean(props.selectedType) || props.selectedTags.length > 0;
  const defaultAccordionItems = ['product-type', ...tagGroups.map((group) => group.key)];

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-[28px] border border-border/80 bg-[rgba(255,255,255,0.82)] shadow-[0_20px_50px_-36px_rgba(24,20,22,0.28)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Shop By
            </p>
            <div className="flex items-center gap-2 text-foreground">
              <Filter className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Refine products</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Narrow the catalog with product type and tag filters.
            </p>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto rounded-full px-3 py-1.5 text-xs"
              onClick={props.onClearAll}
            >
              Clear all
            </Button>
          ) : null}
        </div>

        {selectedTagItems.length > 0 ? (
          <>
            <Separator className="bg-border/70" />
            <div className="px-5 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Selected Tags
                </p>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {selectedTagItems.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedTagItems.map((tag) => (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => props.onTagToggle(tag.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span>{tag.label}</span>
                    <X className="size-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <Separator className="bg-border/70" />

        <Accordion
          defaultValue={defaultAccordionItems}
          className="px-5 py-3 sm:px-6"
          multiple
        >
          <AccordionItem value="product-type" className="border-border/70">
            <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
              <div className="flex min-w-0 items-center gap-3">
                <span>Product Type</span>
                {props.selectedType ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    1
                  </span>
                ) : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-4">
              {PRODUCT_TYPE_ITEMS.map((item) => (
                <FilterOptionButton
                  key={item.value}
                  label={item.label}
                  isSelected={item.value === (props.selectedType ?? '')}
                  onClick={() => props.onTypeChange(item.value)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>

          {tagGroups.map((group) => {
            const selectedCount = group.tags.filter((tag) => selectedTagSet.has(normalizeTagSlug(tag.slug))).length;

            return (
              <AccordionItem key={group.key} value={group.key} className="border-border/70">
                <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                  <div className="flex min-w-0 items-center gap-3">
                    <span>{group.label}</span>
                    {selectedCount > 0 ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {selectedCount}
                      </span>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div
                    className={cn(
                      'space-y-2',
                      group.tags.length > 8 && 'max-h-72 overflow-y-auto pr-1',
                    )}
                  >
                    {group.tags.map((tag) => (
                      <TagCheckboxRow
                        key={tag.id}
                        checked={selectedTagSet.has(normalizeTagSlug(tag.slug))}
                        label={tag.name}
                        onChange={() => props.onTagToggle(tag.slug)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {tagGroups.length === 0 ? (
          <>
            <Separator className="bg-border/70" />
            <div className="px-5 py-4 text-sm text-muted-foreground sm:px-6">
              Tags are not available for this catalog yet.
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
