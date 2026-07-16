'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Gift } from 'lucide-react';
import { AccountProductIdentity } from '@/components/account/account-product-identity';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { AccountPrizeResults } from '@/components/kuji/account-prize-results';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IAccountKujiResult, ICustomerOrderDetail } from '@/interfaces/account';
import {
  isAccountKujiResult,
  normalizeAccountKujiResult,
  normalizeAccountKujiResultCollection,
  normalizeAccountOrderDetail,
} from '@/lib/account-order-normalizers';
import { formatPrice } from '@/lib/utils';

function readAddressValue(address: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : null;
}

function safeTrackingUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function OrderDetail({ order: rawOrder }: { order: ICustomerOrderDetail }) {
  const order = useMemo(() => normalizeAccountOrderDetail(rawOrder), [rawOrder]);
  const queryClient = useQueryClient();
  const [results, setResults] = useState<IAccountKujiResult[]>(() => (
    order.items.flatMap((item) => item.kujiResults.filter(isAccountKujiResult))
  ));
  const [pendingResultId, setPendingResultId] = useState<string | null>(null);
  const [isRevealingAll, setIsRevealingAll] = useState(false);
  const [revealError, setRevealError] = useState('');
  const address = order.shippingAddress;
  const fullName = readAddressValue(address, 'fullName', 'name') || [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
  const city = readAddressValue(address, 'city');
  const province = readAddressValue(address, 'province', 'state');
  const postalCode = readAddressValue(address, 'postalCode', 'postal_code');
  const trackingUrl = safeTrackingUrl(order.shipment?.trackingUrl ?? null);
  const resultById = new Map(results.map((result) => [result.id, result]));
  const unrevealedCount = results.filter((result) => !result.revealedAt && !result.voidedAt).length;

  useEffect(() => {
    setResults(order.items.flatMap((item) => item.kujiResults.filter(isAccountKujiResult)));
  }, [order.items]);

  const revealOne = async (resultId: string) => {
    setRevealError('');
    setPendingResultId(resultId);

    try {
      const response = await MutationConfigs.revealAccountTicket({ publicId: order.publicId, ticketId: resultId });
      const revealed = normalizeAccountKujiResult(response.data.data);
      if (!revealed || revealed.id !== resultId) throw new Error('Invalid reveal response');
      setResults((current) => current.map((result) => result.id === revealed.id ? revealed : result));
      await queryClient.invalidateQueries({ queryKey: ['account', 'kuji'] });
      window.setTimeout(() => document.getElementById(`prize-result-${resultId}`)?.focus(), 0);
    } catch {
      setRevealError('This prize could not be revealed. Please try again.');
    } finally {
      setPendingResultId(null);
    }
  };

  const revealAll = async () => {
    const firstUnrevealedId = results.find((result) => !result.revealedAt && !result.voidedAt)?.id ?? null;
    setRevealError('');
    setIsRevealingAll(true);

    try {
      const response = await MutationConfigs.revealAllAccountTickets(order.publicId);
      setResults(normalizeAccountKujiResultCollection(response.data.data).results);
      await queryClient.invalidateQueries({ queryKey: ['account', 'kuji'] });
      if (firstUnrevealedId) {
        window.setTimeout(() => document.getElementById(`prize-result-${firstUnrevealedId}`)?.focus(), 0);
      }
    } catch {
      setRevealError('Your prizes could not be revealed. Please try again.');
    } finally {
      setIsRevealingAll(false);
    }
  };

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Orders</Link>
      <div className="mt-6 flex flex-col gap-3 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Order</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{order.publicId}</h1></div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-10 py-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-10">
          <section id="kuji-prizes" className="scroll-mt-28">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Items</h2>
              {unrevealedCount > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRevealingAll || pendingResultId !== null}
                  onClick={() => void revealAll()}
                >
                  {isRevealingAll ? <Spinner className="mr-2" /> : <Gift className="mr-2 h-4 w-4" />}
                  Reveal all prizes
                </Button>
              ) : null}
            </div>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <div key={item.productId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-5">
                  <div className="min-w-0">
                    <AccountProductIdentity
                      name={item.productName}
                      productSlug={item.productSlug}
                      isStorefrontAccessible={item.isStorefrontAccessible}
                      imageUrl={item.imageUrl}
                      imageAltText={item.imageAltText}
                    />
                    <p className="mt-2 text-sm text-muted-foreground sm:pl-[5.25rem]">
                      Qty {item.quantity} · {formatPrice(item.unitPriceCents, order.currency)} each
                    </p>
                    {item.productType === 'kuji' ? (
                      <AccountPrizeResults
                        results={item.kujiResults
                          .filter(isAccountKujiResult)
                          .map((result) => resultById.get(result.id) ?? result)}
                        pendingResultId={pendingResultId}
                        disabled={pendingResultId !== null || isRevealingAll}
                        onReveal={(resultId) => void revealOne(resultId)}
                      />
                    ) : null}
                  </div>
                  <p className="font-medium">{formatPrice(item.lineTotalCents, order.currency)}</p>
                </div>
              ))}
            </div>
            {revealError ? <p role="alert" className="mt-3 text-sm text-destructive">{revealError}</p> : null}
          </section>

          <section className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
            <div><h2 className="text-lg font-semibold">Contact</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{order.customer.email}<br />{order.customer.phone ?? readAddressValue(address, 'phone')}</p></div>
            <div><h2 className="text-lg font-semibold">Shipping Address</h2><address className="mt-3 text-sm not-italic leading-6 text-muted-foreground">{fullName ? <>{fullName}<br /></> : null}{readAddressValue(address, 'line1')}<br />{readAddressValue(address, 'line2') ? <>{readAddressValue(address, 'line2')}<br /></> : null}{[city, province, postalCode].filter(Boolean).join(', ')}<br />{readAddressValue(address, 'countryCode', 'country_code')}</address></div>
          </section>

          {order.shipment ? (
            <section className="border-t border-border pt-8"><h2 className="text-lg font-semibold">Shipment</h2><div className="mt-3 text-sm leading-6 text-muted-foreground"><p>{order.shipment.carrierName ?? 'Carrier pending'}</p>{order.shipment.trackingNumber ? <p>Tracking {order.shipment.trackingNumber}</p> : null}{trackingUrl ? <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">View tracking <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div></section>
          ) : null}

        </div>

        <aside className="h-fit border-t border-border pt-6 xl:border-t-0 xl:border-l xl:pl-8">
          <h2 className="text-lg font-semibold">Summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotalCents, order.currency)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Shipping</dt><dd>{formatPrice(order.shippingCents, order.currency)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Tax</dt><dd>{formatPrice(order.taxCents, order.currency)}</dd></div>
            {order.discountCents > 0 ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Discount</dt><dd>-{formatPrice(order.discountCents, order.currency)}</dd></div> : null}
            <div className="flex justify-between gap-4 border-t border-border pt-4 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(order.totalCents, order.currency)}</dd></div>
          </dl>
          <dl className="mt-8 space-y-2 border-t border-border pt-6 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Placed</dt><dd className="text-right">{formatDate(order.placedAt ?? order.createdAt)}</dd></div>{order.paidAt ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Paid</dt><dd className="text-right">{formatDate(order.paidAt)}</dd></div> : null}{order.cancelledAt ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Cancelled</dt><dd className="text-right">{formatDate(order.cancelledAt)}</dd></div> : null}{order.refundedAt ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Refunded</dt><dd className="text-right">{formatDate(order.refundedAt)}</dd></div> : null}</dl>
        </aside>
      </div>
    </div>
  );
}
