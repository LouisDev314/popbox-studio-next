'use client';

import { X } from 'lucide-react';
import type { ITag, productType } from '@/interfaces/product';
import {
  formatTagLabel,
  groupTagsByType,
  normalizeTagSlug,
  PRODUCT_TYPE_ITEMS,
} from '@/lib/storefront-product-filters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

type TFilterPanelVariant = 'sidebar' | 'drawer';

interface IFilterPanelContentProps {
  availableTags: ITag[];
  selectedTags: string[];
  selectedType?: productType;
  onClearAll: () => void;
  onTagToggle: (tagSlug: string) => void;
  onTypeChange: (value: string) => void;
  className?: string;
  variant?: TFilterPanelVariant;
}

type IFilterOptionButtonProps = {
  isSelected: boolean;
  label: string;
  onClick: () => void;
  variant?: TFilterPanelVariant;
};

function FilterOptionButton(props: IFilterOptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={props.isSelected}
      onClick={props.onClick}
      className={cn(
        'cursor-pointer inline-flex min-h-11 max-w-full shrink-0 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium leading-none whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        props.isSelected
          ? 'border-primary/35 bg-primary/10 text-primary shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.32)]'
          : 'border-border/70 bg-background text-foreground hover:border-primary/20 hover:bg-primary/5',
      )}
    >
      <span className="whitespace-nowrap">{props.label}</span>
    </button>
  );
}

type ITagCheckboxRowProps = {
  checked: boolean;
  id: string;
  label: string;
  onChange: () => void;
  variant?: TFilterPanelVariant;
};

type ISelectedTagItem = {
  label: string;
  slug: string;
};

function TagCheckboxRow(props: ITagCheckboxRowProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-xl py-2 text-sm transition-colors',
        props.variant === 'drawer'
          ? 'min-h-11 text-[15px] leading-6 text-foreground'
          : 'text-foreground',
      )}
    >
      <Checkbox
        id={props.id}
        checked={props.checked}
        onCheckedChange={props.onChange}
        className={cn(
          props.variant === 'drawer'
            ? 'mt-0.5 size-5 rounded-[6px] border-border/80 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground [&_[data-slot=checkbox-indicator]>svg]:size-3.5'
            : 'mt-0.5 border-border/80 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground',
        )}
      />
      <span className="min-w-0 flex-1 leading-snug">{props.label}</span>
    </label>
  );
}

type ISelectedFilterChipsProps = {
  isDrawer: boolean;
  items: ISelectedTagItem[];
  onTagToggle: (tagSlug: string) => void;
};

function SelectedFilterChips(props: ISelectedFilterChipsProps) {
  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className={cn(props.isDrawer ? 'pb-1' : 'pb-1')}>
      <div className={cn('flex flex-wrap gap-2', props.isDrawer ? '' : '')}>
        {props.items.map((tag) => (
          <button
            key={tag.slug}
            type="button"
            onClick={() => props.onTagToggle(tag.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              props.isDrawer
                ? 'rounded-full bg-muted px-3 py-1.5 text-foreground hover:bg-muted/80'
                : 'rounded-full border border-border/70 bg-background px-3.5 py-2 text-foreground hover:bg-accent',
            )}
          >
            <span>{tag.label}</span>
            <X className="size-3 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterPanelContent(props: IFilterPanelContentProps) {
  const variant = props.variant ?? 'sidebar';
  const tagGroups = groupTagsByType(props.availableTags);
  const selectedTagSet = new Set(props.selectedTags.map(normalizeTagSlug));
  const tagLookup = new Map(props.availableTags.map((tag) => [normalizeTagSlug(tag.slug), tag]));
  const selectedTagItems = props.selectedTags.map((tagSlug) => ({
    slug: tagSlug,
    label: tagLookup.get(normalizeTagSlug(tagSlug))?.name ?? formatTagLabel(tagSlug),
  }));
  const isDrawer = variant === 'drawer';

  return (
    <div
      className={cn(
        isDrawer
          ? 'min-h-0'
          : 'pt-5',
        props.className,
      )}
    >
      <div className={cn('space-y-6', isDrawer ? 'px-1 py-1' : 'space-y-5')}>
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Product Type</h3>

          <div
            role="group"
            aria-label="Product type filters"
            className="flex flex-wrap gap-2"
          >
            {PRODUCT_TYPE_ITEMS.map((item) => (
              <div key={item.value} className="shrink-0">
                <FilterOptionButton
                  label={item.label}
                  isSelected={item.value === (props.selectedType ?? '')}
                  onClick={() => props.onTypeChange(item.value)}
                  variant={variant}
                />
              </div>
            ))}
          </div>
        </section>

        {selectedTagItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Selected</h3>
              {selectedTagItems.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs font-medium transition-colors hover:bg-primary/10"
                  onClick={props.onClearAll}
                >
                  Clear all
                </Button>
              )}
            </div>
            <SelectedFilterChips
              isDrawer={isDrawer}
              items={selectedTagItems}
              onTagToggle={props.onTagToggle}
            />
          </section>
        )}

        {tagGroups.map((group) => {
          const selectedCount = group.tags.filter((tag) => selectedTagSet.has(normalizeTagSlug(tag.slug))).length;

          return (
            <section key={group.key} className="space-y-3 border-t border-border/70 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                {selectedCount > 0 ? (
                  <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
                ) : null}
              </div>

              <div
                className={cn(
                  'space-y-1',
                  group.tags.length > 8 && 'max-h-72 overflow-y-auto pr-1',
                )}
              >
                {group.tags.map((tag) => (
                  <TagCheckboxRow
                    key={tag.id}
                    checked={selectedTagSet.has(normalizeTagSlug(tag.slug))}
                    id={`product-filter-${variant}-${normalizeTagSlug(tag.slug)}`}
                    label={tag.name}
                    onChange={() => props.onTagToggle(tag.slug)}
                    variant={variant}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {tagGroups.length === 0 ? (
          <>
            <Separator className="bg-border/70" />
            <div className="text-sm text-muted-foreground">
              Tags are not available for this catalog yet.
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
