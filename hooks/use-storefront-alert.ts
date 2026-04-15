'use client';

import { useContext } from 'react';
import { StorefrontAlertContext } from '@/components/storefront/storefront-alert-provider';

export function useStorefrontAlert() {
  const context = useContext(StorefrontAlertContext);

  if (!context) {
    throw new Error('useStorefrontAlert must be used within a StorefrontAlertProvider.');
  }

  return context;
}
