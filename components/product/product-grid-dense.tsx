import type { IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { DENSE_PRODUCT_IMAGE_SIZES, ProductTileDense } from './product-tile-dense';

const DEFAULT_PRIORITY_COUNT = 6;

interface IProductGridDenseProps {
  products: IProductCard[];
  className?: string;
  priorityCount?: number;
  emptyMessage?: string;
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
    <div
      data-slot="product-grid-dense"
      className={cn('grid grid-cols-3 gap-2 px-0.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5', className)}
    >
      {products.map((product, index) => (
        <ProductTileDense
          key={product.id}
          product={product}
          priority={index < priorityCount}
          sizes={sizes}
        />
      ))}
    </div>
  );
}

export function ProductGridDenseSkeleton(props: IProductGridDenseSkeletonProps) {
  const { count = DEFAULT_PRIORITY_COUNT, className } = props;

  return (
    <div
      data-slot="product-grid-dense-skeleton"
      className={cn('grid grid-cols-3 gap-2 px-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-1">
          <div className="aspect-square rounded-xl bg-muted animate-pulse" />
          <div className="h-3 rounded bg-muted/80 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
