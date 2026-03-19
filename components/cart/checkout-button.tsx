'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ICheckoutButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'onClick'> {
  label?: string;
  pendingLabel?: string;
}

export function CheckoutButton({
  className,
  disabled,
  label = 'Check Out',
  pendingLabel = 'Processing...',
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
        className={cn(className, 'gap-1.5')}
        disabled={disabled || !items.length || isPending}
        onClick={handleCheckout}
        {...buttonProps}
      >
        {isPending ? <Spinner data-icon="inline-start" /> : null}
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
