'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Ticket } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import { Button } from '@/components/ui/button';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useCartStore } from '@/hooks/use-cart';
import { ICheckoutSuccess } from '@/interfaces/checkout';
import { getRelativeGuestOrderUrl, getRelativeGuestTicketsUrl } from '@/lib/guest-order-url';

interface ICheckoutSuccessPageClientProps {
  sessionId: string | null;
}

export function CheckoutSuccessPageClient(props: ICheckoutSuccessPageClientProps) {
  const clearCart = useCartStore((state) => state.clearCart);

  const { data: response, isPending, isError } = useCustomizeQuery<ICheckoutSuccess>({
    queryKey: ['checkout-success', props.sessionId],
    queryFn: () => QueryConfigs.fetchCheckoutSuccess(props.sessionId!),
    enabled: !!props.sessionId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const successData = response?.data?.data;

  useEffect(() => {
    if (successData) {
      clearCart();
    }
  }, [successData, clearCart]);

  if (!props.sessionId) {
    return (
      <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Invalid Session</h1>
        <p className="text-muted-foreground mb-8">No checkout session was found.</p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Confirming your order...</p>
      </div>
    );
  }

  if (isError || !successData) {
    return (
      <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Verification Error</h1>
        <p className="text-muted-foreground mb-8">We could not verify your checkout completion. If you were charged, please contact support.</p>
        {/* TODO: embed support form */}
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const { order } = successData;
  const hasKujiTickets = order.tickets && order.tickets.length > 0;
  const publicOrderUrl = getRelativeGuestOrderUrl(successData.clientOrderUrl);
  const publicTicketsUrl = getRelativeGuestTicketsUrl(successData.clientOrderUrl);

  return (
    <div className="container mx-auto px-4 py-20 max-w-3xl text-center flex flex-col items-center">
      <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-sm">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
        Order Confirmed!
      </h1>

      <p className="text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
        Thank you for your purchase. We&apos;ve sent a confirmation email with your order details.
      </p>

      <div className="bg-card w-full border border-border/50 rounded-2xl p-6 md:p-8 mb-8 text-left shadow-sm">
        <h2 className="text-lg font-semibold mb-4 border-b border-border/50 pb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="text-muted-foreground">Order Reference</div>
          <div className="font-medium text-right text-foreground">{order.publicId}</div>

          <div className="text-muted-foreground">Status</div>
          <div className="font-medium text-right text-foreground capitalize">{order.status.replace('_', ' ')}</div>

          <div className="text-muted-foreground">Items</div>
          <div className="font-medium text-right text-foreground">{order.items.reduce((acc: number, item) => acc + item.quantity, 0)}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        {hasKujiTickets ? (
          <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg font-semibold group relative overflow-hidden">
            <Link href={publicTicketsUrl}>
              <span className="absolute inset-0 bg-primary/10 w-full h-full transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Ticket className="mr-2 h-5 w-5 z-10 relative" />
              <span className="z-10 relative">Reveal My Tickets!</span>
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg font-semibold">
            <Link href={publicOrderUrl}>
              View Order Details
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg font-semibold border-border hover:bg-muted">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
