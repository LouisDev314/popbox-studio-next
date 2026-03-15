'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type ICartItem } from '@/interfaces/cart';
import { formatPrice } from '@/utils/helpers';

interface ICartPageItemProps {
  item: ICartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartPageItem(props: ICartPageItemProps) {
  const lineTotalCents = props.item.product.priceCents * props.item.quantity;

  return (
    <article className="rounded-[2rem] border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/products/${props.item.product.slug}`}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-28 sm:w-28"
        >
          <StorefrontImage
            src={props.item.product.images[0]?.url}
            alt={props.item.product.name}
            label={props.item.product.name}
            imageClassName="transition-transform duration-300 hover:scale-[1.03]"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href={`/products/${props.item.product.slug}`}
                className="line-clamp-2 text-base font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {props.item.product.name}
              </Link>
              {props.item.product.collection ? (
                <p className="mt-1 text-sm text-muted-foreground">{props.item.product.collection.name}</p>
              ) : null}
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatPrice(props.item.product.priceCents, props.item.product.currency)} each
              </p>
            </div>

            <p className="shrink-0 text-base font-semibold text-foreground sm:text-right">
              {formatPrice(lineTotalCents, props.item.product.currency)}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <QuantityStepper
              value={props.item.quantity}
              onDecrease={props.onDecrease}
              onIncrease={props.onIncrease}
            />

            <Button
              type="button"
              variant="ghost"
              className="h-10 w-fit rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={props.onRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
