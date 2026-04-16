'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import { useStartCheckout } from '@/hooks/use-start-checkout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getInvalidCartItemsCheckoutMessage } from '@/utils/checkout';

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

  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const { checkoutErrorMessage, isCheckingOut, startCheckout } = useStartCheckout();
  const blockingMessage = invalidItems.length > 0
    ? getInvalidCartItemsCheckoutMessage(invalidItems)
    : checkoutErrorMessage;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className={cn(className, 'gap-1.5')}
        aria-busy={isCheckingOut}
        disabled={disabled || !items.length || invalidItems.length > 0 || isCheckingOut}
        onClick={startCheckout}
        {...buttonProps}
      >
        {isCheckingOut ? <Spinner data-icon="inline-start" /> : null}
        {isCheckingOut ? pendingLabel : label}
      </Button>

      {blockingMessage && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {blockingMessage}
        </p>
      )}
    </div>
  );
}
