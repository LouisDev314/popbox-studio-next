'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { CartInteractionLockOverlay } from '@/components/cart/cart-interaction-lock-overlay';
import { InvalidCartItems } from '@/components/cart/invalid-cart-items';
import { CartPageItem } from '@/components/cart/cart-page-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { formatPrice } from '@/lib/utils';
import { getProductCartLimitMessage, getProductSellableQuantity } from '@/utils/product-stock';

export default function CartPageClient() {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeInvalidItem = useCartStore((state) => state.removeInvalidItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);
  const isHydrated = useCartStore((state) => state.hasHydrated);
  const summary = getCartSummary();

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId);
  };

  if (!isHydrated) {
    return (
      <div className="container mx-auto flex w-full flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4">
            <div className="h-8 w-40 rounded-full bg-muted/40" />
            <div className="h-40 rounded-4xl bg-muted/35" />
            <div className="h-40 rounded-4xl bg-muted/25" />
          </div>
          <div className="h-72 rounded-4xl bg-muted/35" />
        </div>
      </div>
    );
  }

  if (items.length === 0 && invalidItems.length === 0) {
    return (
      <div className="container mx-auto flex flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-border/70 bg-card px-8 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Your cart is empty</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Pick a few things you like, then come back here to finish checkout.
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
      <div className="relative" aria-busy={isCheckingOut}>
        <div
          className={isCheckingOut ? 'pointer-events-none select-none opacity-70 transition-opacity duration-200' : 'transition-opacity duration-200'}
          inert={isCheckingOut}
        >
          <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="justify-self-center font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cart</p>
              <h1 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your cart total is {formatPrice(summary.totalCents, summary.currency)}
              </h1>
              <CheckoutButton
                size="lg"
                className="mt-6 h-12 w-full rounded-full text-base font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <section className="space-y-4" aria-label="Cart items">
              <InvalidCartItems
                disabled={isCheckingOut}
                items={invalidItems}
                onRemove={removeInvalidItem}
              />
              {items.map((item) => (
                (() => {
                  const quantityLimit = getProductSellableQuantity(item.product);
                  const limitMessage = getProductCartLimitMessage(item.product, item.quantity);

                  return (
                    <CartPageItem
                      key={item.id}
                      disabled={isCheckingOut}
                      item={item}
                      maxQuantity={quantityLimit}
                      limitMessage={limitMessage}
                      onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                      onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  );
                })()
              ))}
            </section>

            <div className="lg:sticky lg:top-24">
              <CartSummary
                summary={summary}
                note=""
              />
              <CheckoutButton
                size="lg"
                className="mt-6 h-12 w-full rounded-full text-base font-semibold"
              />
            </div>

            <div className="flex justify-center">
              <Button asChild variant="outline" className="rounded-xl px-5">
                Continue shopping
              </Button>
            </div>
          </div>
        </div>

        {isCheckingOut && <CartInteractionLockOverlay />}
      </div>
    </div>
  );
}
