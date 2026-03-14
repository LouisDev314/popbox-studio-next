'use client';

import { IProductCard } from '@/interfaces/product';
import Link from 'next/link';
import { formatPrice } from '@/utils/helpers';
import { Button } from '@/components/ui/button';

interface IProductCardProps {
  product: IProductCard;
}

export function ProductCard(props: IProductCardProps) {
  const isKuji = props.product.productType === 'kuji';
  const mainImage = props.product.images?.[0]?.url || '/placeholder.png'; // Assuming generic placeholder handling

  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4">
      <Link href={`/products/${props.product.slug}`} className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl z-10">
        <span className="sr-only">View product {props.product.name}</span>
      </Link>
      
      <div className="relative aspect-square w-full rounded-xl bg-muted/30 overflow-hidden flex items-center justify-center">
        {isKuji && (
          <div className="absolute left-2 top-2 z-20 rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground shadow-sm sm:text-xs">
            Ichiban Kuji
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainImage} 
          alt={props.product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-in-out"
          loading="lazy"
        />
      </div>

      <div className="flex flex-col gap-1 z-20">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:min-h-[1.75rem] sm:text-lg">
          {props.product.name}
        </h3>
        {props.product.collection && (
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {props.product.collection.name}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2 z-20">
        <p className="text-base font-bold text-foreground sm:text-lg">
          {formatPrice(props.product.priceCents, props.product.currency)}
        </p>
        <Button variant="outline" size="sm" className="pointer-events-none rounded-full border-primary/20 bg-background px-3 text-xs hover:bg-primary hover:text-primary-foreground group-hover:border-primary sm:text-sm">
          View
        </Button>
      </div>
    </div>
  );
}
