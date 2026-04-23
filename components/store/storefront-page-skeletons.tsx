import { ProductCarouselSkeleton } from '@/components/product/product-carousel';
import { ProductGridDenseSkeleton } from '@/components/product/product-grid-dense';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function SkeletonPill(props: { className?: string }) {
  return <Skeleton className={cn('h-8 rounded-full', props.className)} />;
}

function SkeletonTextBlock(props: { lines?: string[]; className?: string }) {
  const lines = props.lines ?? ['w-full', 'w-5/6', 'w-3/4'];

  return (
    <div className={cn('space-y-3', props.className)}>
      {lines.map((lineClassName, index) => (
        <Skeleton key={`${lineClassName}-${index}`} className={cn('h-4 rounded-full', lineClassName)} />
      ))}
    </div>
  );
}

function SectionHeadingSkeleton(props: { alignEnd?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'mb-4 flex items-end justify-between gap-4 sm:mb-6',
        props.alignEnd ? 'lg:items-end' : '',
        props.className,
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-36 rounded-full sm:h-10 sm:w-48" />
        <Skeleton className="h-4 w-44 rounded-full sm:w-56" />
      </div>
      <Skeleton className="h-5 w-18 rounded-full" />
    </div>
  );
}

function ListingSidebarSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm">
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </div>

        <div className="space-y-4 border-t border-border/50 pt-6">
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-10 w-5/6 rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-10 w-4/5 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemSkeleton() {
  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="aspect-square w-24 shrink-0 rounded-2xl sm:w-28" />
        <div className="min-w-0 flex-1 space-y-3 pt-1">
          <Skeleton className="h-5 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-1/3 rounded-full" />
          <div className="flex items-center justify-between gap-4 pt-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="w-full">
      <section className="group relative overflow-hidden bg-background">
        <div className="relative aspect-[1.85/1] w-full overflow-hidden sm:aspect-[2/1]">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 sm:px-7 sm:pb-6 sm:pt-20 lg:px-10 lg:pb-9 lg:pt-20 xl:px-12 xl:pb-10">
            <div className="min-w-0">
              <Skeleton className="mb-3 h-3 w-28 rounded-full sm:h-4 sm:w-32" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-4/5 rounded-[1rem] sm:h-12 md:h-14" />
                <Skeleton className="h-10 w-3/5 rounded-[1rem] sm:h-12 md:h-14" />
              </div>
              <Skeleton className="mt-3 h-5 w-24 rounded-full sm:mt-4 sm:h-6 sm:w-28" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 flex items-center justify-center gap-2 md:mt-4">
        <Skeleton className="h-2 w-8 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>

      <section className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="aspect-[20/7] w-full rounded-[1.25rem] border border-border/60" />
        </div>
      </section>

      <div className="container mx-auto w-full px-4 pt-0 md:px-6 lg:px-8">
        <section className="mb-16">
          <SectionHeadingSkeleton />
          <ProductGridDenseSkeleton count={6} className="px-0.5" />
        </section>

        <section className="mb-14 md:mb-16">
          <SectionHeadingSkeleton />
          <ProductGridDenseSkeleton count={9} className="px-0.5" />
        </section>

        <section className="mb-14 md:mb-16">
          <SectionHeadingSkeleton />
          <ProductGridDenseSkeleton count={10} className="px-0.5" />
        </section>

        <section className="mx-auto w-full pt-2 text-center">
          <div className="border border-border/70 bg-card px-6 py-18 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
            <div className="mx-auto max-w-2xl">
              <Skeleton className="mx-auto h-10 w-3/4 rounded-[1rem] sm:h-11" />
              <div className="mt-4 space-y-3">
                <Skeleton className="mx-auto h-4 w-full rounded-full" />
                <Skeleton className="mx-auto h-4 w-4/5 rounded-full" />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 sm:flex-row">
              <Skeleton className="h-12 w-36 rounded-2xl sm:min-w-44" />
              <Skeleton className="h-12 w-40 rounded-2xl sm:min-w-44" />
            </div>
          </div>

          <div className="relative overflow-hidden border border-border/60 bg-card text-left">
            <Skeleton className="min-h-48 rounded-none sm:min-h-58 lg:min-h-68" />
            <div className="absolute inset-0 flex min-h-48 items-end px-6 py-6 sm:min-h-58 sm:px-8 sm:py-8 lg:min-h-68 lg:px-10 lg:py-10">
              <div className="space-y-3">
                <Skeleton className="h-10 w-64 rounded-[1rem] sm:h-11 sm:w-80" />
                <Skeleton className="h-10 w-56 rounded-[1rem] sm:h-11 sm:w-72" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function LegalPageSkeleton() {
  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mb-10 border-b border-border/60 pb-6 sm:mb-12 sm:pb-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-[1rem] sm:h-11" />
            <Skeleton className="h-4 w-36 rounded-full" />
          </div>
        </header>

        <article className="space-y-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonTextBlock
              key={index}
              lines={
                index % 3 === 0
                  ? ['w-full', 'w-11/12', 'w-4/5']
                  : index % 3 === 1
                    ? ['w-full', 'w-full', 'w-5/6']
                    : ['w-10/12', 'w-full']
              }
            />
          ))}
        </article>
      </div>
    </div>
  );
}

export function FaqPageSkeleton() {
  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mb-10 border-b border-border/60 pb-6 sm:mb-12 sm:pb-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-28 rounded-[1rem] sm:h-11" />
            <Skeleton className="h-4 w-36 rounded-full" />
          </div>
        </header>

        <div className="space-y-9 sm:space-y-11">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <section key={sectionIndex} className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0">
              <Skeleton className="mb-4 h-7 w-32 rounded-full" />
              <div className="space-y-1">
                {Array.from({ length: 3 }).map((__, itemIndex) => (
                  <div key={itemIndex} className={cn('py-4 sm:py-5', itemIndex > 0 ? 'border-t border-border/60' : '')}>
                    <div className="flex items-center justify-between gap-4">
                      <Skeleton className="h-5 w-4/5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="flex flex-col justify-between lg:justify-start">
            <div className="max-w-2xl space-y-4">
              <Skeleton className="h-12 w-2/3 rounded-[1rem] sm:h-14 lg:h-16" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-4/5 rounded-full" />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-border bg-card/60 p-4">
                  <Skeleton className="mb-3 h-5 w-28 rounded-full" />
                  <SkeletonTextBlock lines={['w-full', 'w-4/5']} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm sm:p-8">
            <Skeleton className="mb-6 h-9 w-40 rounded-[1rem]" />

            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-32 w-full rounded-md" />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-11 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AboutPageSkeleton() {
  return (
    <div className="bg-background">
      <section className="relative border-b border-border/60">
        <div className="container relative z-10 mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="max-w-3xl">
              <SkeletonPill className="w-40" />
              <div className="mt-5 space-y-4">
                <Skeleton className="h-12 w-full rounded-[1rem] sm:h-14 lg:h-16" />
                <Skeleton className="h-12 w-5/6 rounded-[1rem] sm:h-14 lg:h-16" />
              </div>
              <div className="mt-6 max-w-xl space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
                <Skeleton className="h-4 w-5/6 rounded-full" />
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-11 w-40 rounded-full" />
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
            </div>

            <aside className="rounded-[2rem] border border-border/70 bg-background p-6 shadow-sm sm:p-7">
              <Skeleton className="h-4 w-28 rounded-full" />
              <ul className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={index} className={cn(index < 2 ? 'border-b border-border/60 pb-4' : '')}>
                    <Skeleton className="h-5 w-32 rounded-full" />
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-4 w-full rounded-full" />
                      <Skeleton className="h-4 w-4/5 rounded-full" />
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-[1rem]" />
          </div>
          <div className="max-w-2xl space-y-4">
            <SkeletonTextBlock lines={['w-full', 'w-full', 'w-5/6']} />
            <SkeletonTextBlock lines={['w-full', 'w-11/12', 'w-4/5']} />
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-2/3 rounded-[1rem]" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <section
                key={index}
                className="rounded-[1.75rem] border border-border/70 bg-background/85 p-6 shadow-sm"
              >
                <Skeleton className="h-7 w-36 rounded-full" />
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-5/6 rounded-full" />
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function IchibanKujiPageSkeleton() {
  return (
    <div className="bg-background">
      <section className="border-b border-border/60 bg-muted/25">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:items-end">
            <div className="max-w-3xl">
              <Skeleton className="h-4 w-28 rounded-full" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-12 w-full rounded-[1rem] sm:h-14 lg:h-16" />
                <Skeleton className="h-12 w-5/6 rounded-[1rem] sm:h-14 lg:h-16" />
              </div>
              <div className="mt-6 max-w-2xl space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-11 w-44 rounded-full" />
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-card px-6 py-8 shadow-sm ring-1 ring-border/70 sm:px-8">
              <Skeleton className="absolute inset-x-0 top-0 h-18 rounded-none" />
              <div className="relative">
                <Skeleton className="h-[4.5rem] w-[4.5rem] rounded-2xl" />
                <div className="mt-8 space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className={cn(index < 2 ? 'border-b border-border/70 pb-4' : '')}>
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-4 w-full rounded-full" />
                        <Skeleton className="h-4 w-5/6 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-16">
          <div className="space-y-4">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-10 w-full rounded-[1rem]" />
          </div>
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-3 border-t border-border/70 pt-6 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-6">
                <Skeleton className="h-4 w-8 rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-2/3 rounded-full" />
                  <SkeletonTextBlock lines={['w-full', 'w-11/12', 'w-4/5']} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function OrderTicketsPageSkeleton() {
  return (
    <div className="container mx-auto min-h-[70vh] max-w-6xl px-4 py-8 lg:py-12">
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full lg:h-12 lg:w-12" />
            <Skeleton className="h-12 w-52 rounded-[1rem] lg:h-14 lg:w-60" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
        </div>

        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>

      <div className="space-y-14">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section key={sectionIndex} className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-full" />
              <Skeleton className="h-4 w-36 rounded-full" />
            </div>

            <div className="grid grid-cols-1 justify-items-center gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div key={cardIndex} className="w-full max-w-152 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm">
                  <Skeleton className="aspect-[4/5] w-full rounded-[1.25rem]" />
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-5 w-2/3 rounded-full" />
                    <Skeleton className="h-4 w-1/2 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ProductsListingSkeleton(props: {
  headingWidthClassName?: string;
  showDescription?: boolean;
  showSidebar?: boolean;
  gridCount?: number;
}) {
  const {
    headingWidthClassName = 'w-56 sm:w-72',
    showDescription = false,
    showSidebar = true,
    gridCount = 12,
  } = props;

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl space-y-3">
          <Skeleton className={cn('h-11 rounded-[1rem] sm:h-[3.25rem]', headingWidthClassName)} />
          {showDescription ? <Skeleton className="h-4 w-full max-w-2xl rounded-full" /> : null}
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <Skeleton className="h-11 w-28 rounded-full lg:hidden" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        {showSidebar ? (
          <div className="hidden lg:block">
            <ListingSidebarSkeleton />
          </div>
        ) : null}

        <section className="min-w-0">
          <div className="mb-4">
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          <ProductGridDenseSkeleton count={gridCount} className="px-0.5" />
          <div className="mt-12 flex justify-center gap-3">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function SearchLandingSkeleton() {
  return (
    <div className="container mx-auto select-none px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card px-6 py-10 text-center shadow-sm sm:px-8">
        <div className="mx-auto mb-8 max-w-xl space-y-4">
          <Skeleton className="mx-auto h-10 w-4/5 rounded-[1rem] sm:h-12" />
          <Skeleton className="mx-auto h-4 w-2/3 rounded-full" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 rounded-xl sm:w-32 sm:shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-56 rounded-[1rem] sm:h-12 sm:w-72" />
        <Skeleton className="h-4 w-52 rounded-full sm:w-72" />
      </div>

      <ProductGridDenseSkeleton count={10} className="px-0.5" />
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-8 pb-12 sm:px-6 md:pb-16 md:pt-12 lg:px-8">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-square w-full rounded-2xl border border-border/50" />
            <div className="flex gap-3 overflow-hidden pb-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-20 shrink-0 rounded-2xl sm:w-24" />
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonPill className="w-28" />
          </div>

          <div className="mt-4 space-y-4">
            <Skeleton className="h-11 w-full rounded-[1rem] md:h-12" />
            <Skeleton className="h-11 w-4/5 rounded-[1rem] md:h-12" />
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-2">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>

          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-28 rounded-full" />
            <SkeletonTextBlock lines={['w-48', 'w-40']} />
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:mx-auto lg:max-w-4/5">
        <div className="mt-8 rounded-2xl border border-border/60">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={cn('px-4 py-5 sm:px-6', index > 0 ? 'border-t border-border/60' : '')}>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-40 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-28 border-t border-border/60 pt-12">
        <div className="flex items-end justify-between gap-4">
          <Skeleton className="h-8 w-48 rounded-full sm:h-9" />
        </div>

        <ProductCarouselSkeleton className="mt-6 sm:mt-8" count={4} />
      </section>
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="container mx-auto w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-xl">
          <Skeleton className="mx-auto h-4 w-16 rounded-full sm:mx-0" />
          <div className="mt-3 space-y-3">
            <Skeleton className="mx-auto h-10 w-full rounded-[1rem] sm:mx-0 sm:h-11" />
            <Skeleton className="mx-auto h-10 w-5/6 rounded-[1rem] sm:mx-0 sm:w-3/4 sm:h-11" />
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-4" aria-hidden="true">
          <CartItemSkeleton />
          <CartItemSkeleton />
          <CartItemSkeleton />
        </section>

        <div className="lg:sticky lg:top-24">
          <div className="rounded-4xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>

            <div className="mt-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-18 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-18 rounded-full" />
              </div>
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>

        <div className="flex justify-center lg:col-span-2 lg:justify-start">
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutSuccessSkeleton() {
  return (
    <div className="container mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
      <Skeleton className="mb-8 h-20 w-20 rounded-full" />
      <div className="w-full max-w-2xl space-y-4">
        <Skeleton className="mx-auto h-12 w-3/4 rounded-[1rem] md:h-14" />
        <Skeleton className="mx-auto h-5 w-full rounded-full" />
        <Skeleton className="mx-auto h-5 w-4/5 rounded-full" />
      </div>

      <div className="mb-8 mt-8 w-full rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm md:p-8">
        <Skeleton className="h-7 w-40 rounded-full" />
        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid grid-cols-2 gap-y-4 text-sm">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="ml-auto h-4 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
        <Skeleton className="h-14 rounded-xl sm:w-56" />
        <Skeleton className="h-14 rounded-xl sm:w-56" />
      </div>
    </div>
  );
}

export function GuestOrderDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-4 w-32 rounded-full" />
      </div>

      <div className="mb-10 border-b border-border/60 pb-8 sm:mb-12 sm:pb-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="min-w-0 flex-1">
            <div className="space-y-4 text-center">
              <Skeleton className="mx-auto h-4 w-28 rounded-full" />
              <Skeleton className="mx-auto h-11 w-3/4 rounded-[1rem] sm:h-12" />
              <Skeleton className="mx-auto h-11 w-2/3 rounded-[1rem] sm:h-12" />
              <Skeleton className="mx-auto h-4 w-full max-w-xl rounded-full" />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Skeleton className="h-10 w-36 rounded-full" />
              <Skeleton className="h-10 w-36 rounded-full" />
            </div>
          </div>

          <div className="flex justify-center">
            <Skeleton className="h-12 w-48 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <Skeleton className="mb-6 h-7 w-36 rounded-full" />

            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start justify-between border-b border-border/30 py-4 last:border-0 last:pb-0">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40 rounded-full" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-18 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <Skeleton className="mb-6 h-7 w-44 rounded-full" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28 rounded-full" />
                <SkeletonTextBlock lines={['w-40', 'w-36', 'w-32']} />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-28 rounded-full" />
                <SkeletonTextBlock lines={['w-32', 'w-40']} />
              </div>
            </div>
          </div>

          <Skeleton className="h-4 w-72 rounded-full" />
        </div>

        <div className="sticky top-24 h-fit rounded-2xl border border-border/50 bg-card p-6 shadow-sm md:col-span-1">
          <Skeleton className="mb-6 h-7 w-32 rounded-full" />

          <div className="space-y-3 border-t border-border/30 pt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex justify-between text-sm">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-18 rounded-full" />
              </div>
            ))}

            <div className="mt-2 flex justify-between border-t border-border/30 pt-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
