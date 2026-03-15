'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { type ICartSummary } from '@/interfaces/cart';
import { cn, formatPrice } from '@/utils/helpers';

interface ICartSummaryProps {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  heading?: string | null;
  note?: string;
  summary: ICartSummary;
}

export function CartSummary(props: ICartSummaryProps) {
  const resolvedHeading = props.heading === undefined ? 'Order summary' : props.heading;
  const resolvedNote =
    props.note === undefined && props.heading !== null
      ? 'Shipping and tax are estimated on the storefront and should be replaced by backend-authoritative totals at checkout confirmation.'
      : props.note;
  const hasHeaderContent = resolvedHeading !== null || Boolean(resolvedNote);
  const shippingLabel =
    props.summary.shippingCents === 0 && props.summary.hasPhysicalItems
      ? 'Free'
      : formatPrice(props.summary.shippingCents, props.summary.currency);

  return (
    <div className={cn('rounded-3xl border border-border/60 bg-card p-6 shadow-sm', props.className)}>
      {hasHeaderContent ? (
        <div className="space-y-1">
          {resolvedHeading !== null ? (
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{resolvedHeading}</h2>
          ) : null}
          {resolvedNote ? (
            <p className="text-sm text-muted-foreground">{resolvedNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className={cn('space-y-3', hasHeaderContent ? 'mt-6' : '')}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">
            {formatPrice(props.summary.subtotalCents, props.summary.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium text-foreground">{shippingLabel}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated tax</span>
          <span className="font-medium text-foreground">
            {formatPrice(props.summary.estimatedTaxCents, props.summary.currency)}
          </span>
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">Estimated total</span>
            <span className="text-xl font-bold text-foreground">
              {formatPrice(props.summary.totalCents, props.summary.currency)}
            </span>
          </div>
        </div>
      </div>

      {props.actionHref && props.actionLabel ? (
        <Button asChild size="lg" className="mt-6 h-12 w-full rounded-full text-base font-semibold">
          <Link href={props.actionHref}>{props.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
