import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
            <div className="flex flex-col gap-1">
              <Skeleton className="aspect-square rounded-xl" />
              <div className="mt-1 flex flex-col gap-1 px-0.5">
                <Skeleton className="h-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-4/5 rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
