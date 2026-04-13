import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_ITEM_CLASS_NAME =
  'min-w-[10.5rem] shrink-0 snap-start basis-[44vw] sm:basis-[31vw] md:basis-[23vw] lg:basis-[18vw] xl:basis-[15vw]';

interface IProductCarouselProps<TItem> {
  items: TItem[];
  renderItem: (item: TItem, index: number) => ReactNode;
  getItemKey?: (item: TItem, index: number) => string;
  className?: string;
  trackClassName?: string;
  itemClassName?: string;
  emptyMessage?: string;
  ariaLabel?: string;
}

interface IProductCarouselSkeletonProps {
  count?: number;
  className?: string;
  trackClassName?: string;
  itemClassName?: string;
}

export function ProductCarousel<TItem>(props: IProductCarouselProps<TItem>) {
  const {
    items,
    renderItem,
    getItemKey,
    className,
    trackClassName,
    itemClassName,
    emptyMessage = 'No products found.',
    ariaLabel = 'Product carousel',
  } = props;

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      data-slot="product-carousel"
      className={cn(
        'surface-scrollbar overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
    >
      <ul
        data-slot="product-carousel-track"
        className={cn('flex snap-x snap-mandatory gap-3 px-0.5', trackClassName)}
      >
        {items.map((item, index) => (
          <li
            key={getItemKey ? getItemKey(item, index) : index}
            data-slot="product-carousel-item"
            className={cn(DEFAULT_ITEM_CLASS_NAME, itemClassName)}
          >
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductCarouselSkeleton(props: IProductCarouselSkeletonProps) {
  const { count = 4, className, trackClassName, itemClassName } = props;

  return (
    <div
      data-slot="product-carousel-skeleton"
      className={cn(
        'surface-scrollbar overflow-x-auto overscroll-x-contain pb-4',
        className,
      )}
      aria-hidden="true"
    >
      <div
        data-slot="product-carousel-track"
        className={cn('flex snap-x snap-mandatory gap-3 px-0.5', trackClassName)}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            data-slot="product-carousel-item"
            className={cn(DEFAULT_ITEM_CLASS_NAME, itemClassName)}
          >
            <div className="space-y-1">
              <div className="aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-3 rounded bg-muted/80 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
