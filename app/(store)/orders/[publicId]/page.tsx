'use client';

import { useParams } from 'next/navigation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import QueryConfigs from '@/configs/api/query-config';
import { IGuestOrderDetail } from '@/interfaces/order';
import { Loader2, Package, Truck, ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';

export default function GuestOrderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: response, isPending, isError } = useCustomizeQuery<IGuestOrderDetail>({
    queryKey: ['guest-order', id],
    queryFn: () => QueryConfigs.fetchGuestOrder(id!),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !response?.data?.data) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="mb-4 text-3xl font-bold text-destructive">Order Not Found</h1>
        <p className="mb-8 text-muted-foreground">
          This order might not exist or you don&apos;t have permission to view it.
        </p>
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  const order = response.data.data;
  const hasKujiTickets = order.tickets.length > 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/" className="inline-flex items-center hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-5xl font-black">Thank you for your purchase!</h1>
          <p className="text-lg">
            Your order will be processed within 24 hours during business days. We will notify you
            by email once your order has been shipped.
          </p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            Order Number {order.publicId}
          </p>
          <p className="mt-2 text-muted-foreground">
            Placed on {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {hasKujiTickets && (
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 py-6 text-base font-semibold shadow-md"
          >
            <Link href={`/orders/${order.publicId}/tickets`}>
              <Ticket className="mr-2 h-5 w-5" />
              Go to My Tickets
            </Link>
          </Button>
        )}
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
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
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
                  {order.shipment?.trackingNumber && (
                    <span className="mt-2 block font-medium text-primary">
                      Tracking: {order.shipment.trackingNumber}
                    </span>
                  )}
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
