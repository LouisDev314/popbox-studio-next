'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { useCartStore } from '@/hooks/use-cart';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStartCheckout } from '@/hooks/use-start-checkout';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
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
  const checkoutDialog = useCheckoutUiStore((state) => state.checkoutDialog);
  const clearCheckoutDialog = useCheckoutUiStore((state) => state.clearCheckoutDialog);
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

      <ErrorAlert message={blockingMessage} />

      <Dialog
        open={checkoutDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            clearCheckoutDialog();
          }
        }}
      >
        <DialogContent
          title={checkoutDialog?.title ?? 'Checkout message'}
          showCloseButton={false}
          className="max-w-md rounded-2xl border-border/50 bg-card p-6 sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle>{checkoutDialog?.title}</DialogTitle>
            <DialogDescription className="text-base leading-7">
              {checkoutDialog?.message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 border-t border-border/20 pt-4">
            <Button type="button" className="w-full sm:w-auto" onClick={clearCheckoutDialog}>
              {checkoutDialog?.actionLabel ?? 'Okay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
