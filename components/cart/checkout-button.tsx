'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { Button } from '@/components/ui/button';

interface ICheckoutButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'onClick'> {
  label?: string;
  pendingLabel?: string;
}

export function CheckoutButton({
  className,
  disabled,
  label = 'Check Out',
  pendingLabel = 'Redirecting...',
  ...buttonProps
}: ICheckoutButtonProps) {
  const items = useCartStore((state) => state.items);

  const { mutation: createCheckoutSession, isPending, isError } = useCustomizeMutation<
    ICheckoutSession,
    { data: ICheckoutRequest; key: string }
  >({
    mutationFn: ({ data, key }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const handleCheckout = () => {
    if (!items.length) {
      return;
    }

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

    createCheckoutSession(
      { data: requestData, key: uuidv4() },
      {
        onSuccess: (response) => {
          const checkoutUrl = response.data.data?.checkoutUrl;

          if (!checkoutUrl) {
            return;
          }

          window.location.assign(checkoutUrl);
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className={className}
        disabled={disabled || !items.length || isPending}
        onClick={handleCheckout}
        {...buttonProps}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isPending ? pendingLabel : label}
      </Button>
      {isError ? (
        <p className="text-sm font-medium text-destructive">
          We couldn&apos;t start Stripe Checkout. Please try again.
        </p>
      ) : null}
    </div>
  );
}
