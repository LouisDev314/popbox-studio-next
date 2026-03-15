'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Storefront picks</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{props.title}</h2>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden rounded-full px-4 sm:inline-flex">
          <Link href={props.viewAllHref}>View all</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {props.products.slice(0, SECTION_PREVIEW_LIMIT).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Button asChild variant="outline" size="lg" className="rounded-full px-6">
          <Link href={props.viewAllHref}>View all</Link>
        </Button>
      </div>
    </section>
  );
}
