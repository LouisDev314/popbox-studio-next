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
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5 text-muted-foreground" />
              Order Items
            </h2>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between border-b border-border/30 py-4 last:border-0 last:pb-0"
                >
                  <div className="flex gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-lg">
                      <StorefrontImage
                        src={item.imageUrl}
                        alt={item.productName}
                        label={item.productName}
                        sizes="64px"
                      />
                    </div>

                    <div>
                      <h3 className="font-medium text-foreground">{item.productName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>

                  <div className="font-medium text-foreground">
                    {formatPrice(item.lineTotalCents, order.currency)}
                  </div>
                </div>
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

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxes</span>
              <span className="font-medium text-foreground">
                {formatPrice(order.taxCents, order.currency)}
              </span>
            </div>

            <div className="mt-2 flex justify-between border-t border-border/30 pt-4">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">
                {formatPrice(order.totalCents, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
