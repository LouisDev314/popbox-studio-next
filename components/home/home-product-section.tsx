import Link from 'next/link';
import { ProductGridDense } from '@/components/product/product-grid-dense';
import { IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';

interface IHomeProductSectionProps {
  title: string;
  products: IProductCard[];
  viewAllHref: string;
  limit: number;
  className?: string;
  headerClassName?: string;
}

export function HomeProductSection(props: IHomeProductSectionProps) {
  if (props.products.length === 0) {
    return null;
  }

  const previewProducts = props.products.slice(0, props.limit);

  return (
    <section className={cn('mb-14 md:mb-16', props.className)}>
      <div className={cn('mb-4 sm:mb-6 flex items-end justify-between gap-4', props.headerClassName)}>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">{props.title}</h2>
        <Link
          href={props.viewAllHref}
          className="text-sm underline underline-offset-3 font-medium transition-colors hover:text-foreground"
        >
          View All
        </Link>
      </div>

      <ProductGridDense products={previewProducts} priorityCount={6} />
    </section>
  );
}
