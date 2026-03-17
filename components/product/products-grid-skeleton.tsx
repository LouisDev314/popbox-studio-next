interface IProductsGridSkeletonProps {
  count?: number;
}

export function ProductsGridSkeleton(props: IProductsGridSkeletonProps) {
  const count = props.count ?? 8;

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm"
        >
          <div className="aspect-square animate-pulse bg-muted/40" />

          <div className="space-y-4 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted/40" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted/30" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted/30" />
          </div>
        </article>
      ))}
    </div>
  );
}
