'use client';

import { useEffect, useRef, useState } from 'react';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IOrderDetail } from '@/interfaces/order';
import { getPurchasedProductIdsFromOrder, isFinalizedCheckoutOrder } from '@/utils/checkout';

interface ICheckoutSuccessEffectsProps {
  sessionId: string;
  order: IOrderDetail;
}

export function CheckoutSuccessEffects(props: ICheckoutSuccessEffectsProps) {
  const clearCart = useCartStore((state) => state.clearCart);
  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
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
    if (
      !hasEstablishedAccess ||
      hasCleanedUp.current ||
      !hasCartHydrated ||
      !hasWishlistHydrated ||
      !isFinalizedCheckoutOrder(props.order)
    ) {
      return;
    }

    hasCleanedUp.current = true;
    clearCart();
    removeWishlistItems(getPurchasedProductIdsFromOrder(props.order));
  }, [
    clearCart,
    hasCartHydrated,
    hasEstablishedAccess,
    hasWishlistHydrated,
    props.order,
    removeWishlistItems,
  ]);

  return null;
}
