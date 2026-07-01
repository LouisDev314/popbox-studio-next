'use client';

import { useEffect } from 'react';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';

function isBackForwardNavigation(): boolean {
  const navigationEntry = performance
    .getEntriesByType('navigation')
    .at(0) as PerformanceNavigationTiming | undefined;

  return navigationEntry?.type === 'back_forward';
}

function isRestoredPageShow(event: PageTransitionEvent): boolean {
  return event.persisted || isBackForwardNavigation();
}

export function useCheckoutRestoreGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!isRestoredPageShow(event)) {
        return;
      }

      useCheckoutUiStore.getState().endCheckout();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);
}
