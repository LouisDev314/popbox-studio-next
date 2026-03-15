'use client';

import { useSyncExternalStore } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/utils/helpers';
import { useRouter } from 'next/navigation';

interface ICartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer(props: ICartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getCartSummary } = useCartStore();
  const cartSummary = getCartSummary();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!props.isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm"
        onClick={props.onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-sm transform flex-col border-l border-border bg-background shadow-lg transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart {isClient && cartSummary.totalItems > 0 && `(${cartSummary.totalItems})`}
          </h2>
          <Button variant="ghost" size="icon" onClick={props.onClose} className="rounded-full">
            <X className="h-5 w-5" />
            <span className="sr-only">Close cart</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(!isClient || items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <ShoppingBag className="h-12 w-12 opacity-20" />
              <p>Your cart is empty.</p>
              <Button onClick={props.onClose} variant="outline" className="mt-4">
                Continue Shopping
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="h-20 w-20 shrink-0 rounded-md bg-muted/40 border border-border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.images[0]?.url || '/placeholder.png'}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-medium line-clamp-2 leading-tight">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground font-semibold">
                      {formatPrice(item.product.priceCents, item.product.currency)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center rounded-full border border-border">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-muted rounded-l-full"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-muted rounded-r-full"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isClient && items.length > 0 && (
          <div className="border-t border-border p-6 bg-card/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold">Subtotal</span>
              <span className="text-lg font-bold">
                {formatPrice(cartSummary.subtotalCents, cartSummary.currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Shipping and tax stay estimated on the cart page. Final totals still come from checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                onClick={() => {
                  props.onClose();
                  router.push('/cart');
                }}
              >
                View Cart
              </Button>
              <Button
                className="h-12 text-base font-semibold rounded-xl"
                onClick={() => {
                  props.onClose();
                  router.push('/checkout');
                }}
              >
                Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
