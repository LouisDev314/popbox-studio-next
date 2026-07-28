'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { InvalidCartItems } from '@/components/cart/invalid-cart-items';
import { CartPageItem } from '@/components/cart/cart-page-item';
import { CartMigrationNotice } from '@/components/cart/cart-migration-notice';
import { CartCheckoutPanel } from '@/components/cart/cart-checkout-panel';
import { CartPageSkeleton } from '@/components/store/storefront-page-skeletons';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { formatPrice } from '@/lib/utils';
import { getProductCartLimitMessage, getProductSellableQuantity } from '@/utils/product-stock';
import { CartViewTracker } from '@/components/analytics/ecommerce-trackers';

export default function CartPageClient() {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeInvalidItem = useCartStore((state) => state.removeInvalidItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const migrationNotice = useCartStore((state) => state.migrationNotice);
  const dismissMigrationNotice = useCartStore((state) => state.dismissMigrationNotice);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);
  const isHydrated = useCartStore((state) => state.hasHydrated);
  const summary = getCartSummary();
  const hasKujiItems = items.some((item) => item.product.productType === 'kuji');

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId);
  };

  if (!isHydrated) {
    return <CartPageSkeleton />;
  }

  if (items.length === 0 && invalidItems.length === 0) {
    return (
      <div className="container mx-auto flex flex-1 flex-col px-4 py-20 sm:px-6 lg:px-8">
        {migrationNotice ? (
          <div className="mx-auto mb-5 w-full max-w-xl">
            <CartMigrationNotice
              notice={migrationNotice}
              onDismiss={dismissMigrationNotice}
            />
          </div>
        ) : null}
        <div className="mx-auto flex w-full max-w-xl flex-col items-center rounded-2xl border border-dashed border-border/70 bg-card px-8 py-14 text-center shadow-sm">
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
      <CartViewTracker items={items} />
      <div className="relative" aria-busy={isCheckingOut}>
        <div
          data-testid="cart-checkout-shell"
          className={isCheckingOut ? 'pointer-events-none select-none opacity-70 transition-opacity duration-200' : 'transition-opacity duration-200'}
          inert={isCheckingOut}
        >
          <div className="mx-auto mb-6 flex max-w-4xl flex-col justify-center gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="justify-self-center font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cart</p>
              <h1 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your cart subtotal is {formatPrice(summary.subtotalCents, summary.currency)}
              </h1>
            </div>
          </div>

          <CartCheckoutPanel
            summary={summary}
            summaryNote={(
              <span>
                {hasKujiItems ? 'Kuji items are random draw and final sale. ' : ''}
                <Link href="/legal/shipping-returns" className="underline underline-offset-4 transition-colors hover:text-foreground">
                  Shipping &amp; Returns
                </Link>
              </span>
            )}
          >
            <section className="space-y-4" aria-label="Cart items">
              {migrationNotice ? (
                <CartMigrationNotice
                  notice={migrationNotice}
                  onDismiss={dismissMigrationNotice}
                />
              ) : null}
              <InvalidCartItems
                disabled={isCheckingOut}
                items={invalidItems}
                onRemove={removeInvalidItem}
              />
              {items.map((item) => (
                (() => {
                  const quantityLimit = item.product.productType === 'standard'
                    ? 20
                    : getProductSellableQuantity(item.product);
                  const limitMessage = item.product.productType === 'standard'
                    ? item.quantity >= 20
                      ? 'Maximum quantity reached. Exact availability is confirmed at checkout.'
                      : null
                    : getProductCartLimitMessage(item.product, item.quantity);

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
          </CartCheckoutPanel>
        </div>

      </div>
    </div>
  );
}
