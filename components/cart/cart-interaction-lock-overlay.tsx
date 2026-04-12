'use client';

import { Spinner } from '@/components/ui/spinner';

interface ICartInteractionLockOverlayProps {
  message?: string;
  title?: string;
}

export function CartInteractionLockOverlay(props: ICartInteractionLockOverlayProps) {
  const title = props.title ?? 'Preparing secure checkout...';
  const message = props.message ?? 'Your items are reserved for a moment.';

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/70"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-4 flex max-w-sm items-start gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
