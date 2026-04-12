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
  if (props.variant === 'drawer') {
    return (
      <button
        type="button"
        aria-pressed={props.isSelected}
        onClick={props.onClick}
        className={cn(
          'flex min-h-12 w-full items-center justify-center rounded-[18px] border px-4 py-3 text-center text-sm font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          props.isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border/70 bg-background text-foreground hover:border-border hover:bg-muted/35',
        )}
      >
        <span>{props.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        props.isSelected
          ? 'border-primary/25 bg-accent/50 text-foreground shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]'
          : 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/55 hover:text-foreground',
      )}
    >
      <span className="font-medium">{props.label}</span>
      <span
        className={cn(
          'size-2.5 rounded-full transition-colors',
          props.isSelected ? 'bg-primary' : 'bg-border/80',
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
        'flex cursor-pointer gap-3 text-sm transition-all',
        props.variant === 'drawer'
          ? cn(
            'min-h-12 items-center gap-3.5 rounded-2xl py-1.5 pr-2 text-[15px] leading-6 text-foreground',
          )
          : cn(
            'items-start rounded-2xl border px-4 py-3',
            props.checked
              ? 'border-primary/20 bg-accent/45 text-foreground'
              : 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/45 hover:text-foreground',
          ),
      )}
    >
      <Checkbox
        checked={props.checked}
        onCheckedChange={props.onChange}
        className={cn(
          props.variant === 'drawer'
            ? 'mt-0 size-5 rounded-[6px] border-border/80 data-[checked]:border-foreground data-[checked]:bg-foreground [&_[data-slot=checkbox-indicator]>svg]:size-3.5'
            : 'mt-0.5',
        )}
      />
      <span className="min-w-0 leading-snug">{props.label}</span>
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
    <div className={cn(props.isDrawer ? 'pb-2' : 'px-5 py-4 sm:px-6')}>
      <div className={cn('flex flex-wrap gap-2', props.isDrawer ? 'mt-3 px-1' : '')}>
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
  const hasActiveFilters = Boolean(props.selectedType) || props.selectedTags.length > 0;
  const isDrawer = variant === 'drawer';

  return (
    <div
      className={cn(
        isDrawer
          ? 'min-h-0'
          : 'overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_22px_60px_-42px_rgba(15,23,42,0.35)]',
        props.className,
      )}
    >
      {!isDrawer ? (
        <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Shop By
            </p>
            <div className="flex items-center gap-2 text-foreground">
              <Filter className="size-4 text-primary" />
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
      ) : null}

      {!isDrawer ? <Separator className="bg-border/70" /> : null}

      <SelectedFilterChips
        isDrawer={isDrawer}
        items={selectedTagItems}
        onTagToggle={props.onTagToggle}
      />

      {isDrawer ? (
        <div className="space-y-7 px-1 pt-3 pb-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">Product Type</h3>
            </div>

            <div
              role="group"
              aria-label="Product type filters"
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
            >
              {PRODUCT_TYPE_ITEMS.map((item) => (
                <FilterOptionButton
                  key={item.value}
                  label={item.label}
                  isSelected={item.value === (props.selectedType ?? '')}
                  onClick={() => props.onTypeChange(item.value)}
                  variant={variant}
                />
              ))}
            </div>
          </section>

          <Separator className='h-px w-full' />

          {tagGroups.map((group, index) => {
            const selectedCount = group.tags.filter((tag) => selectedTagSet.has(normalizeTagSlug(tag.slug))).length;

            const isLast = index === tagGroups.length - 1;

            return (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                  {selectedCount > 0 ? (
                    <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    'space-y-1.5',
                    group.tags.length > 8 && 'max-h-72 overflow-y-auto pr-1',
                  )}
                >
                  {group.tags.map((tag) => (
                    <TagCheckboxRow
                      key={tag.id}
                      checked={selectedTagSet.has(normalizeTagSlug(tag.slug))}
                      label={tag.name}
                      onChange={() => props.onTagToggle(tag.slug)}
                      variant={variant}
                    />
                  ))}
                </div>
                {!isLast ? <Separator className="h-px w-full" /> : null}
              </section>
            );
          })}
        </div>
      ) : (
        <Accordion
          defaultValue={['product-type', ...tagGroups.map((group) => group.key)]}
          className="px-5 py-2 sm:px-6"
          multiple
        >
          <AccordionItem value="product-type" className="border-border/70">
            <AccordionTrigger className="py-3.5 text-sm font-semibold hover:no-underline">
              <div className="flex min-w-0 items-center gap-3">
                <span>Product Type</span>
                {props.selectedType ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-foreground">
                    1
                  </span>
                ) : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div
                role="group"
                aria-label="Product type filters"
                className="grid grid-cols-2 gap-2.5"
              >
                {PRODUCT_TYPE_ITEMS.map((item) => (
                  <div
                    key={item.value}
                    className={cn(item.value === '' && 'col-span-2')}
                  >
                    <FilterOptionButton
                      label={item.label}
                      isSelected={item.value === (props.selectedType ?? '')}
                      onClick={() => props.onTypeChange(item.value)}
                      variant={variant}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {tagGroups.map((group) => {
            const selectedCount = group.tags.filter((tag) => selectedTagSet.has(normalizeTagSlug(tag.slug))).length;

            return (
              <AccordionItem
                key={group.key}
                value={group.key}
                className="border-border/70"
              >
                <AccordionTrigger className="py-3.5 text-sm font-semibold hover:no-underline">
                  <div className="flex min-w-0 items-center gap-3">
                    <span>{group.label}</span>
                    {selectedCount > 0 ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-foreground">
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
                        variant={variant}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {tagGroups.length === 0 ? (
        <div className={cn(
          isDrawer
            ? 'px-1 pt-4 text-sm text-muted-foreground'
            : 'px-5 py-4 text-sm text-muted-foreground sm:px-6',
        )}>
          Tags are not available for this catalog yet.
        </div>
      ) : null}
    </div>
  );
}
