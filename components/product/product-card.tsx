'use client';

import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/lib/utils';

interface IProductCardProps {
  product: IProductCard;
}

export function ProductCard(props: IProductCardProps) {
  const isKuji = props.product.productType === 'kuji';

  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-[1.75rem] border border-border/50 bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4">
      <Link
        href={`/products/${props.product.slug}`}
        className="absolute inset-0 z-10 rounded-[1.75rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">View product {props.product.name}</span>
      </Link>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.4rem] bg-muted/30">
        {isKuji && (
          <div className="absolute left-3 top-2 z-20 rounded-md bg-primary/60 px-2 py-1 text-[10px] font-bold text-secondary-foreground shadow-sm sm:text-xs">
            Ichiban Kuji
          </div>
        )}
        <StorefrontImage
          src={props.product.images?.[0]?.url}
          alt={props.product.name}
          label={props.product.name}
          imageClassName="transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
      </div>

      <div className="z-20 flex flex-col gap-1">
        <h3 className="line-clamp-2 min-h-11 text-base font-semibold text-foreground transition-colors sm:min-h-7 sm:text-lg">
          {props.product.name}
        </h3>
        {props.product.collection && (
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {props.product.collection.name}
          </p>
        )}
      </div>

      <p className="text-base text-primary font-bold sm:text-lg">
        {formatPrice(props.product.priceCents, props.product.currency)}
      </p>
    </div>
  );
}
