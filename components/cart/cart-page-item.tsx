'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ICartItem } from '@/interfaces/cart';
import { formatPrice } from '@/utils/helpers';

interface ICartPageItemProps {
  item: ICartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartPageItem(props: ICartPageItemProps) {
  const imageUrl = props.item.product.images[0]?.url ?? '/placeholder.png';
  const lineTotalCents = props.item.product.priceCents * props.item.quantity;

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <Link
          href={`/products/${props.item.product.slug}`}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 sm:h-28 sm:w-28"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={props.item.product.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/products/${props.item.product.slug}`}
                className="line-clamp-2 text-base font-semibold text-foreground transition-colors hover:text-primary"
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

            <p className="shrink-0 text-base font-semibold text-foreground">
              {formatPrice(lineTotalCents, props.item.product.currency)}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/80">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-full"
                onClick={props.onDecrease}
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Decrease quantity</span>
              </Button>
              <span className="w-10 text-center text-sm font-semibold text-foreground">
                {props.item.quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-full"
                onClick={props.onIncrease}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Increase quantity</span>
              </Button>
            </div>

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
