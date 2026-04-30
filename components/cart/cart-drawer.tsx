'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { CartInteractionLockOverlay } from '@/components/cart/cart-interaction-lock-overlay';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { InvalidCartItems } from '@/components/cart/invalid-cart-items';
import { Button } from '@/components/ui/button';
import { StorefrontDrawerEmptyState } from '@/components/ui/storefront-drawer-empty-state';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { StorefrontDrawer } from '@/components/ui/storefront-drawer';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { formatPrice } from '@/lib/utils';
import { getProductCartLimitMessage, getProductSellableQuantity } from '@/utils/product-stock';

interface ICartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonId?: string;
}

function CartDrawerItemSkeleton() {
  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-card p-4">
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CartDrawer(props: ICartDrawerProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const triggerButtonId = props.triggerButtonId;
  const router = useRouter();
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeInvalidItem = useCartStore((state) => state.removeInvalidItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const cartSummary = getCartSummary();
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);
  const totalItems = cartSummary.totalItems + invalidItems.reduce((count, item) => count + item.quantity, 0);
  const hasKujiItems = items.some((item) => item.product.productType === 'kuji');
  const shippingLabel =
    cartSummary.shippingCents === 0 && cartSummary.subtotalCents > 0
      ? 'FREE'
      : formatPrice(cartSummary.shippingCents, cartSummary.currency);
  const freeShippingMessage =
    cartSummary.subtotalCents === 0
      ? null
      : cartSummary.amountUntilFreeShippingCents > 0
        ? `You are ${formatPrice(cartSummary.amountUntilFreeShippingCents, cartSummary.currency)} away from free shipping.`
        : 'You qualify for free shipping.';

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId);
  };

  return (
    <StorefrontDrawer
      isOpen={isOpen}
      onClose={onClose}
      canClose={!isCheckingOut}
      triggerButtonId={triggerButtonId}
      contentClassName="overflow-hidden"
      bodyClassName="p-0"
      footerClassName="bg-card"
      title={
        <>
          <ShoppingBag className="h-5 w-5" />
          Cart {hasHydrated && totalItems > 0 && `(${totalItems})`}
        </>
      }
      footer={hasHydrated && items.length > 0 ? (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full rounded-full"
            disabled={isCheckingOut}
            onClick={() => {
              onClose();
            }}
          >
            Continue Shopping
          </Button>
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(cartSummary.subtotalCents, cartSummary.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Shipping</span>
              <span className="font-semibold text-foreground">{shippingLabel}</span>
            </div>
            {freeShippingMessage ? (
              <p className="rounded-2xl bg-accent/45 px-3 py-2 text-xs font-medium leading-5 text-foreground">
                {freeShippingMessage}
              </p>
            ) : null}
          </div>
          {/* TEMP: Tax disabled (not collecting tax yet) */}
          {/* <p className="mb-2 text-xs leading-5 text-muted-foreground">
            Shipping and tax stay estimated on the cart page. Final totals still come from checkout.
          </p> */}
          <p className="mb-6 text-xs leading-5 text-muted-foreground">
            {hasKujiItems ? 'Kuji items are random draw and final sale. ' : ''}
            <Link href="/legal/shipping-returns" className="underline underline-offset-4 transition-colors hover:text-foreground">
              Shipping &amp; Returns
            </Link>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-full"
              disabled={isCheckingOut}
              onClick={() => {
                onClose();
                router.push('/cart');
              }}
            >
              View Cart
            </Button>
            <CheckoutButton
              className="h-12 w-full rounded-full font-semibold"
              label="Check Out"
            />
          </div>
        </div>
      ) : undefined}
      overlay={isCheckingOut ? (
        <CartInteractionLockOverlay
          title="Preparing secure checkout..."
          message="Your cart is reserved until we hand you off to the secure checkout page."
        />
      ) : null}
    >
      <div
        className={isCheckingOut ? 'flex min-h-0 flex-1 flex-col pointer-events-none select-none opacity-70 transition-opacity duration-200' : 'flex min-h-0 flex-1 flex-col transition-opacity duration-200'}
        inert={isCheckingOut}
        aria-busy={isCheckingOut}
      >
        <div className="flex-1 overflow-y-auto py-5 px-4">
          {!hasHydrated ? (
            <div className="space-y-4" aria-hidden="true">
              <Skeleton className="h-6 w-28 rounded-full" />
              <CartDrawerItemSkeleton />
              <CartDrawerItemSkeleton />
            </div>
          ) : items.length === 0 && invalidItems.length === 0 ? (
            <StorefrontDrawerEmptyState
              icon={<ShoppingBag className="h-7 w-7 text-muted-foreground" />}
              title="Your cart is empty"
              description="Pick a few things you like, then come back here to finish checkout."
              action={(
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5"
                  onClick={() => {
                    onClose();
                  }}
                >
                  Continue Shopping
                </Button>
              )}
            />
          ) : (
            <div className="space-y-4">
              <InvalidCartItems
                compact={true}
                disabled={isCheckingOut}
                items={invalidItems}
                onRemove={removeInvalidItem}
              />
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.75rem] border border-border/70 bg-card p-4">
                  {(() => {
                    const quantityLimit = getProductSellableQuantity(item.product);
                    const limitMessage = getProductCartLimitMessage(item.product, item.quantity);

                    return (
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
                          <StorefrontImage
                            src={item.product.images[0]?.url}
                            alt={item.product.name}
                            label={item.product.name}
                            sizes="80px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                            {item.product.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatPrice(item.product.priceCents, item.product.currency)}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <QuantityStepper
                              size="sm"
                              disabled={isCheckingOut}
                              value={item.quantity}
                              decreaseDisabled={item.quantity <= 1}
                              increaseDisabled={item.quantity >= quantityLimit}
                              onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                              onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isCheckingOut}
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              Remove
                            </Button>
                          </div>
                          {limitMessage ? (
                            <p className="mt-2 text-xs font-medium text-muted-foreground">{limitMessage}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </article>
              ))}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-fit rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isCheckingOut}
                  onClick={clearCart}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Clear cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </StorefrontDrawer>
  );
}
