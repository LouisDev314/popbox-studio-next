import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/lib/utils';
import { getProductInventoryState } from '@/utils/product-stock';

interface IProductCardProps {
  product: IProductCard;
}

export function ProductCard(props: IProductCardProps) {
  const isKuji = props.product.productType === 'kuji';
  const inventoryState = getProductInventoryState(props.product);

  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-white p-3 transition-shadow duration-300 hover:shadow-md sm:gap-4 sm:p-4">
      <Link
        href={`/products/${props.product.slug}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">View product {props.product.name}</span>
      </Link>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1rem] bg-muted/30">
        {isKuji && (
          <div className="absolute left-3 top-3 z-20 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:text-[11px]">
            Kuji
          </div>
        )}
        {inventoryState.hasInventoryData && inventoryState.status === 'sold_out' ? (
          <div className="absolute bottom-3 right-3 z-20 rounded-full bg-foreground/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background shadow-sm backdrop-blur-sm sm:text-[11px]">
            Sold Out
          </div>
        ) : null}
        <StorefrontImage
          src={props.product.images?.[0]?.url}
          alt={props.product.name}
          label={props.product.name}
          imageClassName="transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
      </div>

      <div className="z-20 flex flex-col">
        <h3 className="line-clamp-2 min-h-11 text-base font-semibold text-foreground transition-colors sm:min-h-7 sm:text-lg">
          {props.product.name}
        </h3>
        {props.product.collection && (
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {props.product.collection.name}
          </p>
        )}
      </div>

      <p className="mt-auto pt-1 text-base font-semibold text-primary sm:text-lg">
        {formatPrice(props.product.priceCents, props.product.currency)}
      </p>
    </div>
  );
}
