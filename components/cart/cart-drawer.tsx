'use client';

import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { useCartStore } from '@/hooks/use-cart';
import { cn, formatPrice } from '@/lib/utils';
import { getProductCartLimitMessage, getProductSellableQuantity } from '@/utils/product-stock';

interface ICartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonId?: string;
}

export function CartDrawer(props: ICartDrawerProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const triggerButtonId = props.triggerButtonId;
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const cartSummary = getCartSummary();
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      window.requestAnimationFrame(() => {
        const triggerButton = triggerButtonId ? document.getElementById(triggerButtonId) : null;
        triggerButton?.focus();
      });
    };
  }, [isOpen, onClose, triggerButtonId]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[70] bg-foreground/12 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal={true}
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-labelledby={titleId}
        className={cn(
          'fixed inset-y-0 right-0 z-[71] flex w-full max-w-sm flex-col border-l border-border/70 bg-background shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <ShoppingBag className="h-5 w-5" />
            Cart {hasHydrated && cartSummary.totalItems > 0 && `(${cartSummary.totalItems})`}
          </h2>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!hasHydrated ? (
            <div className="space-y-4">
              <div className="h-6 w-28 rounded-full bg-muted/40" />
              <div className="h-24 rounded-3xl bg-muted/35" />
              <div className="h-24 rounded-3xl bg-muted/25" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-card/70 px-8 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Your cart is empty</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a few collectibles first, then return here for a quick checkout handoff.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-sm">
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
                              onClick={() => removeItem(item.id)}
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
              <div className='flex justify-center'>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-fit rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Clear cart
                </Button>
              </div>
            </div>
          )}
        </div>

        {hasHydrated && items.length > 0 ? (
          <div className="border-t border-border/70 bg-card/60 px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(cartSummary.subtotalCents, cartSummary.currency)}
              </span>
            </div>
            <p className="mb-4 text-xs leading-5 text-muted-foreground">
              Shipping and tax stay estimated on the cart page. Final totals still come from checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-full"
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
        ) : null}
      </aside>
    </>
  );
}
