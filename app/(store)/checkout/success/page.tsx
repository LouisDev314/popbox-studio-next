import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPublicCheckoutSuccess } from '@/lib/api/public-storefront';
import {
  CheckoutSuccessChromeReady,
  CheckoutSuccessEffects,
} from './checkout-success-effects';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Checkout success',
  description: 'Review your PopBox Studio checkout confirmation and next steps.',
  path: '/checkout/success',
  noIndex: true,
});

function normalizeSessionId(sessionId: string | string[] | undefined) {
  if (Array.isArray(sessionId)) {
    return sessionId[0] ?? null;
  }

  return sessionId ?? null;
}

export default async function CheckoutSuccessPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const sessionId = normalizeSessionId(searchParams.session_id);

  if (!sessionId) {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-32 text-center">
        <h1 className="mb-4 text-3xl font-bold text-destructive">Invalid Session</h1>
        <p className="mb-8 text-muted-foreground">No checkout session was found.</p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  let successData = null;

  try {
    successData = await getPublicCheckoutSuccess(sessionId);
  } catch {
    successData = null;
  }

  if (!successData) {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-32 text-center">
        <CheckoutSuccessChromeReady sessionId={sessionId} />
        <h1 className="mb-4 text-3xl font-bold text-destructive">Verification Error</h1>
        <p className="mb-8 text-muted-foreground">
          We could not verify your checkout completion. If you were charged, please contact support.
        </p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const { order } = successData;
  const hasKujiTickets = order.tickets && order.tickets.length > 0;
  const publicOrderUrl = `/orders/${order.publicId}`;
  const publicTicketsUrl = `/orders/${order.publicId}/tickets`;

  return (
    <CheckoutSuccessEffects sessionId={sessionId} order={order}>
      <div className="container mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-primary shadow-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Order Confirmed!
        </h1>

        <p className="mb-8 max-w-xl text-xl leading-relaxed text-muted-foreground">
          Thank you for your purchase. We&apos;ve sent a confirmation email with your order details.
        </p>

        <div className="mb-8 w-full rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm md:p-8">
          <h2 className="mb-4 border-b border-border/50 pb-4 text-lg font-semibold">Order Details</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-muted-foreground">Order Number</div>
            <div className="text-right font-medium text-foreground">{order.publicId}</div>

            <div className="text-muted-foreground">Status</div>
            <div className="text-right font-medium capitalize text-foreground">{order.status.replace('_', ' ')}</div>

            <div className="text-muted-foreground">Items</div>
            <div className="text-right font-medium text-foreground">
              {order.items.reduce((acc: number, item) => acc + item.quantity, 0)}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
          {hasKujiTickets ? (
            <Button asChild size="lg" className="h-14 rounded-xl px-8 text-lg font-semibold">
              <Link href={publicTicketsUrl}>
                <Ticket className="mr-2 h-5 w-5" />
                Reveal My Tickets!
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-14 rounded-xl px-8 text-lg font-semibold">
              <Link href={publicOrderUrl}>View Order Details</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="h-14 rounded-xl border-border px-8 text-lg font-semibold hover:bg-muted">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </CheckoutSuccessEffects>
  );
}
