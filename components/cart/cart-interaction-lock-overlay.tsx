'use client';

import { Spinner } from '@/components/ui/spinner';

interface ICartInteractionLockOverlayProps {
  message?: string;
  title?: string;
}

export function CartInteractionLockOverlay(props: ICartInteractionLockOverlayProps) {
  const title = props.title ?? 'Preparing secure checkout';
  const message = props.message ?? 'Your cart is temporarily locked while we create your checkout session.';

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-4 flex max-w-sm items-start gap-3 rounded-[1.75rem] border border-border/70 bg-card/95 px-5 py-4 shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.45)]">
        <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
