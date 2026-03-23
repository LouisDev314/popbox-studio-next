'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import { useStartCheckout } from '@/hooks/use-start-checkout';
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
  const { isCheckingOut, isError, startCheckout } = useStartCheckout();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className={cn(className, 'gap-1.5')}
        aria-busy={isCheckingOut}
        disabled={disabled || !items.length || isCheckingOut}
        onClick={startCheckout}
        {...buttonProps}
      >
        {isCheckingOut ? <Spinner data-icon="inline-start" /> : null}
        {isCheckingOut ? pendingLabel : label}
      </Button>

      {isError ? (
        <p className="text-sm font-medium text-destructive">
          We couldn&apos;t start Checkout. Please review your cart or try again.
        </p>
      ) : null}
    </div>
  );
}
