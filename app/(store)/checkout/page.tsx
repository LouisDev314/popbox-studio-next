'use client';

import { useSyncExternalStore } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import useCustomizeMutation from '@/hooks/use-customize-mutation';

import MutationConfigs from '@/configs/api/mutation-config';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { Button } from '@/components/ui/button';
import { CartSummary } from '@/components/cart/cart-summary';
import { formatPrice } from '@/utils/helpers';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, getCartSummary } = useCartStore();
  const cartSummary = getCartSummary();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const { mutation: mutate, isPending, isError } = useCustomizeMutation<ICheckoutSession, { data: ICheckoutRequest; key: string }>({
    mutationFn: ({ data, key }: { data: ICheckoutRequest; key: string }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const handleCheckout = () => {
    if (items.length === 0) return;

    // We pass placeholder/null data for the address fields because 
    // we are now using Stripe Prebuilt Checkout to securely collect this information.
    const requestData: ICheckoutRequest = {
      email: '',
      firstName: null,
      lastName: null,
      phone: null,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      shippingAddress: {
        fullName: null,
        line1: null,
        line2: null,
        city: null,
        province: null,
        postalCode: null,
        countryCode: null,
        phone: null,
      },
      billingAddress: null,
      billingSameAsShipping: true,
    };

    mutate(
      { data: requestData, key: uuidv4() },
      {
        onSuccess: (res) => {
          if (res?.data?.data?.checkoutUrl) {
            window.location.href = res.data.data.checkoutUrl;
          }
        },
      },
    );
  };

  if (!isHydrated) {
    return (
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="h-[30rem] rounded-3xl bg-muted/40 lg:col-span-7 xl:col-span-8" />
          <div className="h-[24rem] rounded-3xl bg-muted/40 lg:col-span-5 xl:col-span-4" />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Add items to your cart before checking out.</p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8 text-center">Review &amp; Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-semibold mb-6">Your Items</h2>
          <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50">
                <div className="h-20 w-20 shrink-0 bg-muted/30 rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.product.images[0]?.url || '/placeholder.png'} alt={item.product.name} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                  <div className="text-sm font-semibold text-foreground mt-2">
                    {formatPrice(item.product.priceCents * item.quantity, item.product.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="bg-card border border-border/50 rounded-2xl p-6 sticky top-24 shadow-sm">
            <CartSummary
              summary={cartSummary}
              className="border-0 bg-transparent p-0 shadow-none"
              heading="Order Summary"
              note="Final shipping and taxes will be calculated securely at checkout."
            />

            {isError && (
              <div className="mt-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                An error occurred starting your checkout session. Please try again.
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={isPending}
              size="lg"
              className="w-full h-14 rounded-full font-bold text-lg mt-8 shadow-md"
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPending ? 'Processing...' : 'Proceed to Stripe Checkout'}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
               You will be redirected to Stripe to securely complete your payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
