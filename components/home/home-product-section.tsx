import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { IProductCard } from '@/interfaces/product';

const SECTION_PREVIEW_LIMIT = 8;

interface IHomeProductSectionProps {
  title: string;
  products: IProductCard[];
  viewAllHref: string;
}

export function HomeProductSection(props: IHomeProductSectionProps) {
  if (props.products.length === 0) {
    return null;
  }

  return (
    <section className="mb-14 md:mb-16">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">{props.title}</h2>
        <Link
          href={props.viewAllHref}
          className="text-sm underline underline-offset-3 font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View All
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
        {props.products.slice(0, SECTION_PREVIEW_LIMIT).map((product) => (
          <div key={product.id} className="w-50 flex-none snap-start md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
