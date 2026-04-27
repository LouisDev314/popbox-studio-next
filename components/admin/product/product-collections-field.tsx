'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ICollection } from '@/interfaces/product';

interface IProductCollectionsFieldProps {
  collections: ICollection[];
  selectedCollectionIds: string[];
  onSelectedCollectionIdsChange: (collectionIds: string[]) => void;
}

export function ProductCollectionsField({
  collections,
  selectedCollectionIds,
  onSelectedCollectionIdsChange,
}: IProductCollectionsFieldProps) {
  const selectedCollectionIdSet = new Set(selectedCollectionIds);

  const toggleCollection = (collectionId: string) => {
    onSelectedCollectionIdsChange(
      selectedCollectionIdSet.has(collectionId)
        ? selectedCollectionIds.filter((id) => id !== collectionId)
        : [...selectedCollectionIds, collectionId],
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <label className="block text-sm font-medium text-foreground">Collections</label>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {selectedCollectionIds.length} selected
          </span>
          {selectedCollectionIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-7 rounded-md px-2 text-xs text-muted-foreground"
              onClick={() => onSelectedCollectionIdsChange([])}
            >
              Clear all
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-input bg-background p-2">
        {collections.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No collections available.</p>
        ) : (
          collections.map((collection) => {
            const isSelected = selectedCollectionIdSet.has(collection.id);

            return (
              <label
                key={collection.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted/70',
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleCollection(collection.id)}
                  className="mt-0.5 border-border/80 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{collection.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{collection.slug}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
