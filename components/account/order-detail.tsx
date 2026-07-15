'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { OrderTicketExperience } from '@/components/kuji/order-ticket-experience';
import { normalizeAccountTicket, normalizeRawOrderTicket, normalizeRawTicketView } from '@/components/kuji/ticket-adapter';
import { StorefrontImage } from '@/components/ui/storefront-image';
import MutationConfigs from '@/configs/api/mutation-config';
import type { ICustomerOrderDetail } from '@/interfaces/account';
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

export function OrderDetail({ order }: { order: ICustomerOrderDetail }) {
  const queryClient = useQueryClient();
  const address = order.shippingAddress;
  const fullName = readAddressValue(address, 'fullName', 'name') || [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
  const city = readAddressValue(address, 'city');
  const province = readAddressValue(address, 'province', 'state');
  const postalCode = readAddressValue(address, 'postalCode', 'postal_code');
  const trackingUrl = safeTrackingUrl(order.shipment?.trackingUrl ?? null);

  const revealOne = async (ticketId: string) => {
    const response = await MutationConfigs.revealAccountTicket({ publicId: order.publicId, ticketId });
    await queryClient.invalidateQueries({ queryKey: ['account', 'kuji'] });
    return normalizeRawOrderTicket(response.data.data);
  };

  const revealAll = async () => {
    const response = await MutationConfigs.revealAllAccountTickets(order.publicId);
    await queryClient.invalidateQueries({ queryKey: ['account', 'kuji'] });
    return normalizeRawTicketView(response.data.data);
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
          <section>
            <h2 className="text-lg font-semibold">Items</h2>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <div key={item.productId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-4 py-5">
                  <div className="h-18 w-18 overflow-hidden rounded-lg bg-muted"><StorefrontImage src={item.imageUrl} alt={item.imageAltText ?? item.productName} label={item.productName} sizes="72px" imageClassName="object-cover" /></div>
                  <div><p className="font-medium">{item.productName}</p><p className="mt-1 text-sm text-muted-foreground">Qty {item.quantity} · {formatPrice(item.unitPriceCents, order.currency)} each</p></div>
                  <p className="font-medium">{formatPrice(item.lineTotalCents, order.currency)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
            <div><h2 className="text-lg font-semibold">Contact</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{order.customer.email}<br />{order.customer.phone ?? readAddressValue(address, 'phone')}</p></div>
            <div><h2 className="text-lg font-semibold">Shipping Address</h2><address className="mt-3 text-sm not-italic leading-6 text-muted-foreground">{fullName ? <>{fullName}<br /></> : null}{readAddressValue(address, 'line1')}<br />{readAddressValue(address, 'line2') ? <>{readAddressValue(address, 'line2')}<br /></> : null}{[city, province, postalCode].filter(Boolean).join(', ')}<br />{readAddressValue(address, 'countryCode', 'country_code')}</address></div>
          </section>

          {order.shipment ? (
            <section className="border-t border-border pt-8"><h2 className="text-lg font-semibold">Shipment</h2><div className="mt-3 text-sm leading-6 text-muted-foreground"><p>{order.shipment.carrierName ?? 'Carrier pending'}</p>{order.shipment.trackingNumber ? <p>Tracking {order.shipment.trackingNumber}</p> : null}{trackingUrl ? <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">View tracking <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div></section>
          ) : null}

          <section id="tickets" className="scroll-mt-28 border-t border-border pt-8"><h2 className="text-lg font-semibold">Kuji Tickets</h2><div className="mt-5"><OrderTicketExperience initialTickets={order.tickets.map(normalizeAccountTicket)} onRevealOne={revealOne} onRevealAll={revealAll} /></div></section>
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
