import { Skeleton } from '@/components/ui/skeleton';
import type { IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { DENSE_PRODUCT_IMAGE_SIZES, ProductTileDense } from './product-tile-dense';
import { ProductListViewTracker } from '@/components/analytics/ecommerce-trackers';
import type { IAnalyticsListContext } from '@/lib/analytics';

const DEFAULT_PRIORITY_COUNT = 6;

interface IProductGridDenseProps {
  products: IProductCard[];
  className?: string;
  priorityCount?: number;
  emptyMessage?: string;
  list?: IAnalyticsListContext;
  sizes?: string;
}

interface IProductGridDenseSkeletonProps {
  count?: number;
  className?: string;
}

export function ProductGridDense(props: IProductGridDenseProps) {
  const {
    products,
    className,
    priorityCount = DEFAULT_PRIORITY_COUNT,
    emptyMessage = 'No products found.',
    sizes = DENSE_PRODUCT_IMAGE_SIZES,
  } = props;

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {props.list ? <ProductListViewTracker list={props.list} products={products} /> : null}
      <div
        data-slot="product-grid-dense"
        className={cn('grid grid-cols-2 gap-2 px-0.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4', className)}
      >
        {products.map((product, index) => (
          <ProductTileDense
            key={product.id}
            index={index}
            list={props.list}
            product={product}
            priority={index < priorityCount}
            sizes={sizes}
          />
        ))}
      </div>
    </>
  );
}

export function ProductGridDenseSkeleton(props: IProductGridDenseSkeletonProps) {
  const { count = DEFAULT_PRIORITY_COUNT, className } = props;

  return (
    <div
      data-slot="product-grid-dense-skeleton"
      className={cn('grid grid-cols-2 gap-2 px-0.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="mt-1 flex flex-col gap-1 px-0.5">
            <Skeleton className="h-3.5 rounded-full" />
            <Skeleton className="h-3.5 w-4/5 rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
