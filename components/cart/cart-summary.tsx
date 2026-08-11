'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { FreeShippingStatus } from '@/components/cart/free-shipping-status';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePublicShippingSettings } from '@/hooks/use-public-shipping-settings';
import { type ICartSummary } from '@/interfaces/cart';
import { type CheckoutQuoteData } from '@/interfaces/checkout';
import { cn, formatPrice } from '@/lib/utils';
import { calculateFreeShippingProgress } from '@/utils/shipping';
// TEMP: Tax disabled (not collecting tax yet)
// import { Tooltip } from '@/components/ui/tooltip-card';
// import { CircleQuestionMark } from 'lucide-react';

interface ICartSummaryProps {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  heading?: string | null;
  isQuotePending?: boolean;
  note?: ReactNode;
  quote?: CheckoutQuoteData | null;
  summary: ICartSummary;
}

function formatTaxRate(ratePpm: number): string {
  const rate = ratePpm / 10000;

  return `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(2)}%`;
}

function getTaxRows(quote: CheckoutQuoteData | null) {
  const taxBreakdown = quote?.taxBreakdown;

  if (!taxBreakdown) {
    return [];
  }

  return [
    { amountCents: taxBreakdown.gstCents, label: 'GST', ratePpm: taxBreakdown.gstRatePpm },
    { amountCents: taxBreakdown.pstCents, label: 'PST', ratePpm: taxBreakdown.pstRatePpm },
    { amountCents: taxBreakdown.hstCents, label: 'HST', ratePpm: taxBreakdown.hstRatePpm },
    { amountCents: taxBreakdown.qstCents, label: 'QST', ratePpm: taxBreakdown.qstRatePpm },
  ].filter((row) => row.amountCents > 0 || row.ratePpm > 0);
}

function getTaxComponentLabel(row: {
  label: string;
  ratePpm: number;
}): string {
  if (row.ratePpm <= 0) {
    return row.label;
  }

  return `${row.label} ${formatTaxRate(row.ratePpm)}`;
}

function getPrimaryTaxLabel(taxRows: ReturnType<typeof getTaxRows>): string {
  if (taxRows.length !== 1) {
    return 'Tax';
  }

  const [taxRow] = taxRows;

  if (!taxRow?.label) {
    return 'Tax';
  }

  return `Tax (${getTaxComponentLabel(taxRow)})`;
}

function CartSummaryHeader(props: {
  heading: string | null;
  isQuotePending?: boolean;
  note?: ReactNode;
}) {
  if (props.heading === null && !props.note) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        {props.heading !== null ? (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{props.heading}</h2>
        ) : null}
        {props.isQuotePending ? (
          <span className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-muted-foreground">
            <Spinner className="size-3.5" />
            Updating
          </span>
        ) : null}
      </div>
      {props.note ? (
        <p className="text-sm text-muted-foreground">{props.note}</p>
      ) : null}
    </div>
  );
}

function BackendQuoteTotals(props: {
  currency: string;
  quote: CheckoutQuoteData | null;
}) {
  if (!props.quote) {
    return null;
  }

  const taxRows = getTaxRows(props.quote);
  const primaryTaxLabel = getPrimaryTaxLabel(taxRows);
  const shouldShowBreakdownRows = taxRows.length > 1;

  return (
    <div className="space-y-2" data-testid="cart-summary-backend-totals">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{primaryTaxLabel}</span>
        <span className="font-medium text-foreground">
          {formatPrice(props.quote.taxCents, props.currency)}
        </span>
      </div>
      {shouldShowBreakdownRows ? (
        <div className="space-y-1.5 px-3 py-1">
          {taxRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{getTaxComponentLabel(row)}</span>
              <span className="font-medium text-foreground">
                {formatPrice(row.amountCents, props.currency)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getResolvedNote(props: ICartSummaryProps): ReactNode {
  if (props.note !== undefined || props.heading === null) {
    return props.note;
  }

  return 'Shipping and checkout totals are calculated after you enter your delivery address.';
}

function getShippingLabel(params: {
  currency: string;
  isQuotePending: boolean;
  quote: CheckoutQuoteData | null;
}): string {
  if (params.quote) {
    if (params.quote.shippingCents === 0) {
      return 'Free';
    }

    return formatPrice(params.quote.shippingCents, params.currency);
  }

  if (params.isQuotePending) {
    return 'Updating…';
  }

  return 'Calculated after address';
}

export function CartSummary(props: ICartSummaryProps) {
  const shippingSettings = usePublicShippingSettings();
  const resolvedHeading = props.heading === undefined ? 'Order summary' : props.heading;
  const resolvedNote = getResolvedNote(props);
  const hasHeaderContent = resolvedHeading !== null || Boolean(resolvedNote);
  const quote = props.quote ?? null;
  const shippingLabel = getShippingLabel({
    currency: props.summary.currency,
    isQuotePending: Boolean(props.isQuotePending),
    quote,
  });
  const freeShippingProgress = quote
    ? calculateFreeShippingProgress({
      eligibleSubtotalCents: quote.subtotalCents,
      region: quote.shippingRegion,
      thresholdCents: quote.appliedFreeShippingThresholdCents,
    })
    : null;
  const subtotalCents = quote?.subtotalCents ?? props.summary.subtotalCents;

  return (
    <div className={cn('rounded-4xl border border-border/60 bg-card p-6 shadow-sm', props.className)} data-testid="cart-summary">
      <CartSummaryHeader
        heading={resolvedHeading}
        isQuotePending={props.isQuotePending}
        note={resolvedNote}
      />

      <div className={cn('space-y-3', hasHeaderContent ? 'mt-4' : '')}>
        <div className="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Items</span>
          <span className="font-medium text-foreground">{props.summary.totalItems}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">
            {formatPrice(subtotalCents, props.summary.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium text-foreground">{shippingLabel}</span>
        </div>

        {quote ? (
          <FreeShippingStatus
            mode="contextual"
            isFree={quote.shippingCents === 0}
            progress={freeShippingProgress}
            className="rounded-2xl bg-accent/45 px-4 py-3 text-sm"
          />
        ) : (
          <FreeShippingStatus
            mode="generic"
            settings={shippingSettings.settings}
            className="rounded-2xl bg-accent/45 px-4 py-3 text-sm"
          />
        )}

        <BackendQuoteTotals currency={props.summary.currency} quote={quote} />

        <div className="border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center gap-2">
              <span className="text-base font-semibold text-foreground">
                {quote ? 'Total' : 'Checkout total'}
              </span>
              {/* TEMP: Tax disabled (not collecting tax yet) */}
              {/* <Tooltip
                containerClassName="text-muted-foreground"
                content="The sales tax listed on the checkout page is only an estimate. Your invoice will contain the final sales tax, including federal and province taxes, as well as any applicable rebates or fees."
              >
                <CircleQuestionMark className='size-4.5' />
              </Tooltip> */}
            </div>
            <span className="text-xl font-bold text-foreground">
              {quote
                ? formatPrice(quote.totalCents, props.summary.currency)
                : 'Calculated after address'}
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
