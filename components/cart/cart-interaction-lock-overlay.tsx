'use client';

import { CheckoutHandoffOverlay } from '@/components/cart/checkout-handoff-overlay';

interface ICartInteractionLockOverlayProps {
  message?: string;
  title?: string;
}

export function CartInteractionLockOverlay(props: ICartInteractionLockOverlayProps) {
  return <CheckoutHandoffOverlay {...props} />;
}
