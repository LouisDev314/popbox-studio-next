'use client';

import { type ChangeEvent, type FormEvent, useState, useSyncExternalStore } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import useCustomizeMutation from '@/hooks/use-customize-mutation';

import MutationConfigs from '@/configs/api/mutation-config';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { Button } from '@/components/ui/button';
import { CartSummary } from '@/components/cart/cart-summary';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/utils/helpers';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface ICheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}

export default function CheckoutPage() {
  const { items, getCartSummary } = useCartStore();
  const cartSummary = getCartSummary();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [formData, setFormData] = useState<ICheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
  });

  const { mutation: mutate, isPending, isError } = useCustomizeMutation<ICheckoutSession, { data: ICheckoutRequest; key: string }>({
    mutationFn: ({ data, key }: { data: ICheckoutRequest; key: string }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const requestData: ICheckoutRequest = {
      email: formData.email,
      firstName: formData.firstName || null,
      lastName: formData.lastName || null,
      phone: formData.phone || null,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      shippingAddress: {
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        line1: formData.line1,
        line2: formData.line2 || null,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        countryCode: 'CA', // Defaulting for simple storefront
        phone: formData.phone || null,
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Checkout</h1>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email *</label>
                  <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">First Name *</label>
                  <Input id="firstName" name="firstName" required value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">Last Name *</label>
                  <Input id="lastName" name="lastName" required value={formData.lastName} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="line1" className="text-sm font-medium">Address Line 1 *</label>
                  <Input id="line1" name="line1" required value={formData.line1} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="line2" className="text-sm font-medium">Address Line 2 (Apartment, suite, etc.)</label>
                  <Input id="line2" name="line2" value={formData.line2} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium">City *</label>
                    <Input id="city" name="city" required value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="province" className="text-sm font-medium">Province/State *</label>
                    <Input id="province" name="province" required value={formData.province} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="postalCode" className="text-sm font-medium">Postal Code *</label>
                    <Input id="postalCode" name="postalCode" required value={formData.postalCode} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </section>

            {isError && (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                An error occurred during checkout. Please verify your details and try again.
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-card border border-border/50 rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 bg-muted/30 rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.product.images[0]?.url || '/placeholder.png'} alt={item.product.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatPrice(item.product.priceCents * item.quantity, item.product.currency)}
                  </div>
                </div>
              ))}
            </div>

            <CartSummary
              summary={cartSummary}
              className="mt-6 border-0 bg-transparent p-0 shadow-none"
              heading={null}
              note="These are storefront estimates only. The backend checkout session remains the source of truth for payment and fulfillment totals."
            />

            <Button
              type="submit"
              form="checkout-form"
              disabled={isPending}
              size="lg"
              className="w-full h-14 rounded-full font-bold text-lg mt-8"
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPending ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
