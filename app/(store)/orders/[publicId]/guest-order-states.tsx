import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function InvalidOrderLinkState() {
  return (
    <div className="container mx-auto px-4 py-32 text-center">
      <h1 className="mb-4 text-3xl font-bold text-destructive">Invalid Order Link</h1>
      <p className="mb-8 text-muted-foreground">No order id was provided in this URL.</p>
      <Button asChild className="rounded-xl">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}

export function GuestOrderNotFoundState() {
  return (
    <div className="container mx-auto px-4 py-32 text-center">
      <h1 className="mb-4 text-3xl font-bold text-destructive">Order Not Found</h1>
      <p className="mb-8 text-muted-foreground">
        This order might not exist or you don&apos;t have permission to view it.
      </p>
      <Button asChild className="rounded-xl">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}

export function GuestTicketsNotFoundState() {
  return (
    <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
      <h1 className="text-3xl font-bold text-destructive mb-4">Tickets Not Found</h1>
      <p className="text-muted-foreground mb-8">
        This order might not exist or doesn&apos;t have any tickets.
      </p>
      <Button asChild variant="outline" className="rounded-xl">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}

export function GuestAccessFailedState(props: { retryHref: string }) {
  return (
    <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
      <h1 className="text-3xl font-bold text-destructive mb-4">Access Link Unavailable</h1>
      <p className="text-muted-foreground mb-8 max-w-lg">
        We couldn&apos;t verify this guest access link right now. Please try again.
      </p>
      <div className="flex gap-3">
        <Button asChild className="rounded-xl">
          <Link href={props.retryHref}>Try Again</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}

function GuestUnavailableState(props: { title: string; retryHref: string }) {
  return (
    <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
      <h1 className="text-3xl font-bold text-destructive mb-4">{props.title}</h1>
      <p className="text-muted-foreground mb-8 max-w-lg">
        We can&apos;t load this page right now.{<br/>}Please try again in a moment, or open your order from the link in your email.
      </p>
      <div className="flex gap-3">
        <Button asChild className="rounded-xl">
          <Link href={props.retryHref}>Try Again</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}

export function GuestOrderUnavailableState(props: { retryHref: string }) {
  return <GuestUnavailableState title="Order Unavailable" retryHref={props.retryHref} />;
}

export function GuestTicketsUnavailableState(props: { retryHref: string }) {
  return <GuestUnavailableState title="Tickets Unavailable" retryHref={props.retryHref} />;
}
