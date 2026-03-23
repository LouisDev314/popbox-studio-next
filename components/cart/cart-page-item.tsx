'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type ICartItem } from '@/interfaces/cart';
import { formatPrice } from '@/lib/utils';

interface ICartPageItemProps {
  limitMessage?: string | null;
  maxQuantity?: number | null;
  item: ICartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartPageItem(props: ICartPageItemProps) {
  const lineTotalCents = props.item.product.priceCents * props.item.quantity;

  return (
    <article className="rounded-[2rem] border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-row gap-4">
        <Link
          href={`/products/${props.item.product.slug}`}
          className="size-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-28"
        >
          <StorefrontImage
            src={props.item.product.images[0]?.url}
            alt={props.item.product.name}
            label={props.item.product.name}
            imageClassName="transition-transform duration-300 hover:scale-[1.03]"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <div className='flex justify-between items-center'>
                <Link
                  href={`/products/${props.item.product.slug}`}
                  className="line-clamp-2 text-base font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {props.item.product.name}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-fit rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={props.onRemove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {props.item.product.collection ? (
                <p className="mt-1 text-sm text-muted-foreground">{props.item.product.collection.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 sm:mx-1.5 flex justify-between items-center">
            <QuantityStepper
              value={props.item.quantity}
              decreaseDisabled={props.item.quantity <= 1}
              increaseDisabled={props.maxQuantity !== null && props.maxQuantity !== undefined && props.item.quantity >= props.maxQuantity}
              onDecrease={props.onDecrease}
              onIncrease={props.onIncrease}
            />
            <p className="shrink-0 text-lg font-semibold text-foreground sm:text-right">
              {formatPrice(lineTotalCents, props.item.product.currency)}
            </p>
          </div>

          {props.limitMessage ? (
            <p className="mt-3 text-sm font-medium text-muted-foreground">{props.limitMessage}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
