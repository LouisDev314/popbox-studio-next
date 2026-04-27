'use client';

import { useEffect, useRef, useState } from 'react';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IOrderDetail } from '@/interfaces/order';
import {
  getPurchasedLinesFromOrder,
  getPurchasedProductIdsFromOrder,
  isFinalizedCheckoutOrder,
  type IPurchasedLine,
} from '@/utils/checkout';

interface ICheckoutSuccessEffectsProps {
  sessionId: string;
  order: IOrderDetail;
}

function logCheckoutCleanupDebug(
  label: string,
  payload: {
    cartItems: unknown[];
    hasEstablishedAccess: boolean;
    hasCartHydrated: boolean;
    hasWishlistHydrated: boolean;
    isFinalizedOrder: boolean;
    order: IOrderDetail;
    purchasedLines: IPurchasedLine[];
    wishlistItems: unknown[];
  },
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.debug(`[checkout-success-cleanup] ${label}`, {
    cartItems: payload.cartItems,
    hasEstablishedAccess: payload.hasEstablishedAccess,
    hasCartHydrated: payload.hasCartHydrated,
    hasWishlistHydrated: payload.hasWishlistHydrated,
    isFinalizedOrder: payload.isFinalizedOrder,
    orderItems: payload.order.items,
    orderStatus: payload.order.status,
    purchasedLines: payload.purchasedLines,
    wishlistItems: payload.wishlistItems,
  });
}

export function CheckoutSuccessEffects(props: ICheckoutSuccessEffectsProps) {
  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const removePurchasedLines = useCartStore((state) => state.removePurchasedLines);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const removeWishlistItems = useWishlistStore((state) => state.removeWishlistItems);

  const [hasEstablishedAccess, setHasEstablishedAccess] = useState(false);
  const hasRequestedAccess = useRef(false);
  const hasCleanedUp = useRef(false);

  useEffect(() => {
    if (hasRequestedAccess.current) {
      return;
    }

    hasRequestedAccess.current = true;

    let isCancelled = false;

    void QueryConfigs.fetchCheckoutSuccess(props.sessionId)
      .catch(() => undefined)
      .finally(() => {
        if (!isCancelled) {
          setHasEstablishedAccess(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [props.sessionId]);

  useEffect(() => {
    const purchasedLines = getPurchasedLinesFromOrder(props.order);

    logCheckoutCleanupDebug('gate check', {
      cartItems: useCartStore.getState().items,
      hasEstablishedAccess,
      hasCartHydrated,
      hasWishlistHydrated,
      isFinalizedOrder: isFinalizedCheckoutOrder(props.order),
      order: props.order,
      purchasedLines,
      wishlistItems: useWishlistStore.getState().items,
    });

    if (
      !hasEstablishedAccess ||
      hasCleanedUp.current ||
      !hasCartHydrated ||
      !hasWishlistHydrated ||
      !isFinalizedCheckoutOrder(props.order)
    ) {
      return;
    }

    const purchasedProductIds = getPurchasedProductIdsFromOrder(props.order);
    const beforeCartItems = useCartStore.getState().items;
    const beforeWishlistItems = useWishlistStore.getState().items;

    logCheckoutCleanupDebug('before cleanup', {
      cartItems: beforeCartItems,
      hasEstablishedAccess,
      hasCartHydrated,
      hasWishlistHydrated,
      isFinalizedOrder: true,
      order: props.order,
      purchasedLines,
      wishlistItems: beforeWishlistItems,
    });

    if (purchasedLines.length === 0) {
      return;
    }

    useCheckoutUiStore.getState().endCheckout();
    removePurchasedLines(purchasedLines);
    removeWishlistItems(purchasedProductIds);
    hasCleanedUp.current = true;

    logCheckoutCleanupDebug('after cleanup', {
      cartItems: useCartStore.getState().items,
      hasEstablishedAccess,
      hasCartHydrated,
      hasWishlistHydrated,
      isFinalizedOrder: true,
      order: props.order,
      purchasedLines,
      wishlistItems: useWishlistStore.getState().items,
    });
  }, [
    hasCartHydrated,
    hasEstablishedAccess,
    hasWishlistHydrated,
    props.order,
    removePurchasedLines,
    removeWishlistItems,
  ]);

  return null;
}
