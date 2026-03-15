'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { CartPageItem } from '@/components/cart/cart-page-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/hooks/use-cart';

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const summary = getCartSummary();

  if (!isHydrated) {
    return (
      <div className="container mx-auto flex w-full flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4">
            <div className="h-8 w-40 rounded-full bg-muted/40" />
            <div className="h-40 rounded-[2rem] bg-muted/35" />
            <div className="h-40 rounded-[2rem] bg-muted/25" />
          </div>
          <div className="h-72 rounded-[2rem] bg-muted/35" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] border border-dashed border-border/70 bg-card px-8 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Your cart is empty</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Add a few collectibles first, then come back here to review quantity, shipping, and checkout totals.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-8">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cart</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Review your order
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Update quantities, remove items, and verify the estimated total before continuing to payment.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full px-5">
            <Link href="/products">Continue shopping</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-fit rounded-full px-4 text-muted-foreground hover:text-foreground"
            onClick={clearCart}
          >
            Clear cart
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-4" aria-label="Cart items">
          {items.map((item) => (
            <CartPageItem
              key={item.id}
              item={item}
              onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
              onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </section>

        <div className="lg:sticky lg:top-24">
          <CartSummary
            summary={summary}
            actionHref="/checkout"
            actionLabel="Proceed to checkout"
            note="Shipping is estimated with a flat storefront rate for physical orders under $100 CAD. Tax is estimated at 5% GST until checkout returns backend-authoritative totals."
          />
        </div>
      </div>
    </div>
  );
}
