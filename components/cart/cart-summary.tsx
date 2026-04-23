'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { type ICartSummary } from '@/interfaces/cart';
import { cn, formatPrice } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip-card';
import { CircleQuestionMark } from 'lucide-react';

interface ICartSummaryProps {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  heading?: string | null;
  note?: ReactNode;
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
    <div className={cn('rounded-4xl border border-border/60 bg-card p-6 shadow-sm', props.className)}>
      {hasHeaderContent ? (
        <div className="space-y-1.5">
          {resolvedHeading !== null ? (
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{resolvedHeading}</h2>
          ) : null}
          {resolvedNote ? (
            <p className="text-sm text-muted-foreground">{resolvedNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className={cn('space-y-3', hasHeaderContent ? 'mt-4' : '')}>
        <div className="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Items</span>
          <span className="font-medium text-foreground">{props.summary.totalItems}</span>
        </div>

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
            <div className='flex justify-center items-center gap-2'>
              <span className="text-base font-semibold text-foreground">Estimated total</span>
              <Tooltip
                containerClassName="text-muted-foreground"
                content="The sales tax listed on the checkout page is only an estimate. Your invoice will contain the final sales tax, including federal and province taxes, as well as any applicable rebates or fees."
              >
                <CircleQuestionMark className='size-4.5' />
              </Tooltip>
            </div>
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
