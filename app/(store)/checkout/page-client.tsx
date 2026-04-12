'use client';

import Link from 'next/link';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/hooks/use-cart';

export default function CheckoutPageClient() {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const cartItemCount = items.length + invalidItems.length;
  const isHydrated = useCartStore((state) => state.hasHydrated);

  if (!isHydrated) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-72 w-full rounded-4xl bg-muted/35" />
      </div>
    );
  }

  if (!cartItemCount) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Add items to your cart before checking out.</p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border border-border/60 bg-card px-8 py-12 shadow-sm">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Continue to Stripe Checkout</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Stripe handles the payment form, shipping details, and final confirmation. If you returned from a canceled
          payment attempt, your cart is still saved and you can retry below or head back to your cart first.
        </p>
        {invalidItems.length > 0 && (
          <p className="mt-4 text-sm font-medium text-destructive">
            Some saved cart items need attention before checkout. Return to your cart and remove them first.
          </p>
        )}

        <CheckoutButton
          size="lg"
          className="mt-8 h-12 w-full rounded-xl text-base font-semibold"
          label="Continue to Stripe Checkout"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link href="/cart">Return to Cart</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="rounded-xl">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
