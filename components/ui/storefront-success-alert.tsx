'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface IStorefrontSuccessAlertProps {
  message: string;
  description?: string;
  alertId: number;
  durationMs?: number;
  onDismiss?: (alertId: number) => void;
}

const EXIT_DURATION_MS = 300;

export function StorefrontSuccessAlert(props: IStorefrontSuccessAlertProps) {
  const {
    message,
    description,
    alertId,
    durationMs = 2500,
    onDismiss,
  } = props;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const hideTimeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, durationMs);

    const dismissTimeoutId = window.setTimeout(() => {
      onDismiss?.(alertId);
    }, durationMs + EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(dismissTimeoutId);
    };
  }, [alertId, durationMs, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4 sm:px-6">
      <Alert
        role="status"
        aria-live="polite"
        className={cn(
          'w-full max-w-md border-emerald-500/30 bg-emerald-500/10 text-emerald-900 shadow-lg shadow-emerald-950/5 transition-all duration-300',
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
        )}
      >
        <CheckCircle2 className="text-emerald-600" />
        <AlertTitle className="text-emerald-800">{message}</AlertTitle>
        {description ? (
          <AlertDescription className="text-emerald-700/90">
            {description}
          </AlertDescription>
        ) : null}
      </Alert>
    </div>
  );
}
