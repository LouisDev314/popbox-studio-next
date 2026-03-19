'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ICheckoutButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'onClick'> {
  label?: string;
  pendingLabel?: string;
}

export function CheckoutButton(props: ICheckoutButtonProps) {
  const {
    className,
    disabled,
    label = 'Check Out',
    pendingLabel = 'Processing...',
    ...buttonProps
  } = props;

  const items = useCartStore((state) => state.items);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);
  const setIsCheckingOut = useCheckoutUiStore((state) => state.setIsCheckingOut);

  const { mutation: createCheckoutSession, isError } = useCustomizeMutation<
    ICheckoutSession,
    { data: ICheckoutRequest; key: string }
  >({
    mutationFn: ({ data, key }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const handleCheckout = () => {
    if (!items.length || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);

    const requestData: ICheckoutRequest = {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    createCheckoutSession(
      { data: requestData, key: uuidv4() },
      {
        onSuccess: (response) => {
          const checkoutUrl = response.data.data?.checkoutUrl;

          if (!checkoutUrl) {
            setIsCheckingOut(false);
            return;
          }

          window.location.assign(checkoutUrl);
        },
        onError: () => {
          setIsCheckingOut(false);
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className={cn(className, 'gap-1.5')}
        disabled={disabled || !items.length || isCheckingOut}
        onClick={handleCheckout}
        {...buttonProps}
      >
        {isCheckingOut ? <Spinner data-icon="inline-start" /> : null}
        {isCheckingOut ? pendingLabel : label}
      </Button>

      {isError ? (
        <p className="text-sm font-medium text-destructive">
          We couldn&apos;t start Stripe Checkout. Please try again.
        </p>
      ) : null}
    </div>
  );
}
