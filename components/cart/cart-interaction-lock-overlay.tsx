'use client';

import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface ICartInteractionLockOverlayProps {
  message?: string;
  title?: string;
}

let activeScrollLocks = 0;
let previousBodyOverflow = '';

export function CartInteractionLockOverlay(props: ICartInteractionLockOverlayProps) {
  const title = props.title ?? 'Preparing secure checkout...';
  const message = props.message ?? 'Your cart is reserved until we hand you off to the secure checkout page.';

  useEffect(() => {
    if (activeScrollLocks === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    activeScrollLocks += 1;

    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);

      if (activeScrollLocks === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 px-4 backdrop-blur-[2px] pointer-events-auto"
      role="status"
      aria-label={title}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-lg">
        <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
