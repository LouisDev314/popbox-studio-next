'use client';

import { useParams } from 'next/navigation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import QueryConfigs from '@/configs/api/query-config';
import { IGuestOrderDetail } from '@/interfaces/order';
import { Loader2, Package, Truck, ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function GuestOrderPage() {
  const params = useParams();
  const publicId = Array.isArray(params.publicId) ? params.publicId[0] : params.publicId;

  // We only show this via query directly since auth is not required for /access if they have the link
  // The system uses standard UUID urls so we'll just fetch the order directly.
  const { data: response, isPending, isError } = useCustomizeQuery<IGuestOrderDetail>({
    queryKey: ['guest-order', publicId],
    queryFn: () => QueryConfigs.fetchGuestOrder(publicId!),
    enabled: !!publicId,
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
        <h1 className="text-3xl font-bold text-destructive mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">This order might not exist or you don&apos;t have permission to view it.</p>
        <Link href="/" className="text-primary hover:underline">Return to Home</Link>
      </div>
    );
  }

  const order = response.data.data;
  const hasKujiTickets = order.tickets && order.tickets.length > 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Continue Shopping
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Order {order.publicId}</h1>
          <p className="text-muted-foreground mt-2">
            Placed on {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        {hasKujiTickets && (
          <Button asChild size="lg" className="rounded-full shadow-md font-semibold text-base py-6 px-8">
            <Link href={`/orders/${order.publicId}/tickets`}>
              <Ticket className="h-5 w-5 mr-2" />
              Go to My Tickets
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-muted-foreground" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-4 border-b border-border/30 last:border-0 last:pb-0">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 bg-muted/30 rounded-lg shrink-0 flex items-center justify-center font-bold text-muted-foreground">
                      {item.productType === 'kuji' ? 'KUJI' : 'ITEM'}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{item.productName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="font-medium text-foreground">
                    {formatPrice(item.lineTotalCents, order.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Truck className="h-5 w-5 text-muted-foreground" />
              Shipping Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Delivery Address</h3>
                <address className="not-italic text-sm text-muted-foreground space-y-1">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                </address>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Shipment Status</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {order.status.replace('_', ' ')}
                  {order.shipment?.trackingNumber && (
                    <span className="block mt-2 font-medium text-primary">
                      Tracking: {order.shipment.trackingNumber}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 border border-border/50 rounded-2xl p-6 shadow-sm bg-card h-fit sticky top-24">
          <h2 className="text-lg font-semibold mb-6">Order Summary</h2>
          <div className="space-y-3 pt-4 border-t border-border/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{formatPrice(order.subtotalCents, order.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium text-foreground">{formatPrice(order.shippingCents, order.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxes</span>
              <span className="font-medium text-foreground">{formatPrice(order.taxCents, order.currency)}</span>
            </div>
            <div className="border-t border-border/30 pt-4 mt-2 flex justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">{formatPrice(order.totalCents, order.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
