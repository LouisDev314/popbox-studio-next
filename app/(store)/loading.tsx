import { ProductGridDenseSkeleton } from '@/components/product/product-grid-dense';

export default function StoreLoading() {
  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
          <div className="aspect-[6/5] animate-pulse bg-muted/35 md:aspect-[21/9]" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 w-40 animate-pulse rounded-full bg-muted/45" />
            <div className="h-10 w-28 animate-pulse rounded-full bg-muted/40" />
          </div>
          <ProductGridDenseSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
