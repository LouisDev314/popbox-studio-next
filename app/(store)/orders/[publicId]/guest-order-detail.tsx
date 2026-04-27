import Link from 'next/link';
import { ArrowLeft, Package, Ticket, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { IGuestOrderDetail } from '@/interfaces/order';
import { formatPrice } from '@/lib/utils';
import { GuestOrderMeta } from './guest-order-meta';
import { getGuestTicketsPath } from './guest-order-routing';

interface IGuestOrderDetailProps {
  order: IGuestOrderDetail;
}

export function GuestOrderDetail(props: IGuestOrderDetailProps) {
  const { order } = props;
  const hasKujiTickets = order.tickets.length > 0;
  const ticketsHref = getGuestTicketsPath(order.publicId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/" className="inline-flex items-center hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      <div className="mb-10 border-b border-border/60 pb-8 sm:mb-12 sm:pb-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="min-w-0 flex-1">
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Order confirmed
              </p>

              <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Thank you for your order!
              </h1>

              <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Your order will be processed within 2 business days. We’ll email you as
                soon as it ships.
              </p>
            </div>

            <GuestOrderMeta publicId={order.publicId} placedAt={order.placedAt} />
          </div>

          {hasKujiTickets && (
            <div className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl px-6 text-sm font-semibold sm:h-13 sm:px-8 sm:text-base"
              >
                <Link href={ticketsHref}>
                  <Ticket className="mr-2 h-5 w-5 shrink-0" />
                  Go to My Tickets
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border/40 bg-muted/25 px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Package className="h-5 w-5 text-muted-foreground" />
                Order Items
              </h2>
              <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-primary">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-border/30">
              {order.items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-5 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-6"
                >
                  <div className="flex gap-4 sm:contents">
                    <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm">
                      <StorefrontImage
                        src={item.imageUrl}
                        alt={item.imageAltText ?? item.productName}
                        label={item.productName}
                        sizes="96px"
                        imageClassName="object-cover"
                      />
                    </div>

                    <div className="min-w-0 self-center">
                      <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">
                        {item.productName}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>Qty {item.quantity}</span>
                        <span aria-hidden="true" className="text-border">
                          |
                        </span>
                        <span>{formatPrice(item.unitPriceCents, order.currency)} each</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
                    <span className="text-sm text-muted-foreground sm:hidden">Line total</span>
                    <span className="text-lg font-semibold text-foreground sm:text-base">
                      {formatPrice(item.lineTotalCents, order.currency)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Truck className="h-5 w-5 text-muted-foreground" />
              Shipping Information
            </h2>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Delivery Address</h3>
                <address className="space-y-1 not-italic text-sm text-muted-foreground">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                </address>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Shipment Status</h3>
                <p className="text-sm capitalize text-muted-foreground">
                  {order.status.replaceAll('_', ' ')}
                  {order.shipment?.trackingNumber ? (
                    <span className="mt-2 block font-medium text-primary">
                      Tracking: {order.shipment.trackingNumber}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm leading-6 text-muted-foreground">
            Need help after ordering?{' '}
            <Link href="/faq" className="underline underline-offset-4 transition-colors hover:text-foreground">
              View FAQ
            </Link>
            {' or '}
            <Link href="/legal/shipping-returns" className="underline underline-offset-4 transition-colors hover:text-foreground">
              Shipping &amp; Returns
            </Link>
            .
          </div>
        </div>

        <div className="sticky top-24 h-fit rounded-2xl border border-border/50 bg-card p-6 shadow-sm md:col-span-1">
          <h2 className="mb-6 text-lg font-semibold">Order Summary</h2>

          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {formatPrice(order.subtotalCents, order.currency)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium text-foreground">
                {formatPrice(order.shippingCents, order.currency)}
              </span>
            </div>

            {/* TEMP: Tax disabled (not collecting tax yet) */}
            {/* <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxes</span>
              <span className="font-medium text-foreground">
                {formatPrice(order.taxCents, order.currency)}
              </span>
            </div> */}

            <div className="mt-2 flex justify-between border-t border-border/30 pt-4">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-base font-bold text-primary">
                {formatPrice(order.totalCents, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
