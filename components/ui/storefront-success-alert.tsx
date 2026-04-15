'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type TStorefrontAlertVariant = 'success' | 'warning';

interface IStorefrontSuccessAlertProps {
  message: string;
  description?: string;
  alertId: number;
  durationMs?: number;
  variant?: TStorefrontAlertVariant;
  onDismiss?: (alertId: number) => void;
}

const EXIT_DURATION_MS = 300;

export function StorefrontSuccessAlert(props: IStorefrontSuccessAlertProps) {
  const {
    message,
    description,
    alertId,
    durationMs = 2500,
    variant = 'success',
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

  const isWarning = variant === 'warning';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4 sm:px-6">
      <Alert
        role="status"
        aria-live="polite"
        className={cn(
          'w-full max-w-md transition-all duration-300',
          isWarning
            ? 'border-amber-200 bg-amber-50 text-amber-900 shadow-[0_18px_40px_-24px_rgba(180,83,9,0.2)]'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_18px_40px_-24px_rgba(5,150,105,0.32)]',
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
        )}
      >
        {isWarning ? (
          <CircleX className="text-amber-700" />
        ) : (
          <CheckCircle2 className="text-emerald-600" />
        )}
        <AlertTitle className={cn(isWarning ? 'text-amber-800' : 'text-emerald-800')}>
          {message}
        </AlertTitle>
        {description ? (
          <AlertDescription className={cn(isWarning ? 'text-amber-700/90' : 'text-emerald-700/90')}>
            {description}
          </AlertDescription>
        ) : null}
      </Alert>
    </div>
  );
}
