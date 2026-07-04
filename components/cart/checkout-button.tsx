'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ICheckoutButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  isPending?: boolean;
  label?: string;
  pendingLabel?: string;
}

export function CheckoutButton(props: ICheckoutButtonProps) {
  const {
    children,
    className,
    disabled,
    isPending = false,
    label = 'Check Out',
    pendingLabel = 'Processing...',
    type = 'submit',
    ...buttonProps
  } = props;

  return (
    <Button
      type={type}
      className={cn(className, 'gap-1.5')}
      aria-busy={isPending}
      disabled={disabled || isPending}
      {...buttonProps}
    >
      {isPending ? <Spinner data-icon="inline-start" role="presentation" aria-hidden="true" /> : null}
      {children ?? (isPending ? pendingLabel : label)}
    </Button>
  );
}
