'use client';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import QueryConfigs from '@/configs/api/query-config';
import { CheckoutSuccessSkeleton } from '@/components/store/storefront-page-skeletons';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IOrderDetail } from '@/interfaces/order';
import { getPurchasedProductIdsFromOrder, isFinalizedCheckoutOrder } from '@/utils/checkout';

interface ICheckoutSuccessEffectsProps {
  children?: ReactNode;
  sessionId: string;
  order: IOrderDetail;
}

export function CheckoutSuccessChromeReady(props: { sessionId: string }) {
  const markCheckoutSuccessCleanupComplete = useCheckoutUiStore((state) => (
    state.markCheckoutSuccessCleanupComplete
  ));
  const hasMarkedReady = useRef(false);

  useEffect(() => {
    if (hasMarkedReady.current) {
      return;
    }

    hasMarkedReady.current = true;
    markCheckoutSuccessCleanupComplete(props.sessionId);
  }, [markCheckoutSuccessCleanupComplete, props.sessionId]);

  return null;
}

export function CheckoutSuccessEffects(props: ICheckoutSuccessEffectsProps) {
  const purchasedProductIds = useMemo(() => getPurchasedProductIdsFromOrder(props.order), [props.order]);
  const purchasedProductIdSet = useMemo(() => new Set(purchasedProductIds), [purchasedProductIds]);
  const isFinalizedOrder = isFinalizedCheckoutOrder(props.order);

  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const hasPurchasedCartItems = useCartStore((state) => (
    state.items.some((item) => purchasedProductIdSet.has(item.product.id))
  ));
  const removePurchasedProductIds = useCartStore((state) => state.removePurchasedProductIds);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const hasPurchasedWishlistItems = useWishlistStore((state) => (
    state.items.some((item) => purchasedProductIdSet.has(item.id))
  ));
  const removeWishlistItems = useWishlistStore((state) => state.removeWishlistItems);
  const markCheckoutSuccessCleanupComplete = useCheckoutUiStore((state) => (
    state.markCheckoutSuccessCleanupComplete
  ));

  const hasRequestedAccess = useRef(false);
  const hasCleanedUp = useRef(false);

  useEffect(() => {
    if (hasRequestedAccess.current) {
      return;
    }

    hasRequestedAccess.current = true;
    void QueryConfigs.fetchCheckoutSuccess(props.sessionId).catch(() => undefined);
  }, [props.sessionId]);

  useEffect(() => {
    if (
      hasCleanedUp.current ||
      !hasCartHydrated ||
      !hasWishlistHydrated ||
      !isFinalizedOrder
    ) {
      return;
    }

    if (purchasedProductIds.length === 0) {
      hasCleanedUp.current = true;
      markCheckoutSuccessCleanupComplete(props.sessionId);
      return;
    }

    useCheckoutUiStore.getState().endCheckout();
    removePurchasedProductIds(purchasedProductIds);
    removeWishlistItems(purchasedProductIds);
    hasCleanedUp.current = true;
    markCheckoutSuccessCleanupComplete(props.sessionId);
  }, [
    hasCartHydrated,
    hasWishlistHydrated,
    isFinalizedOrder,
    markCheckoutSuccessCleanupComplete,
    purchasedProductIds,
    props.sessionId,
    removePurchasedProductIds,
    removeWishlistItems,
  ]);

  if (!props.children) {
    return null;
  }

  const canShowContent = (
    hasCartHydrated &&
    hasWishlistHydrated &&
    (
      !isFinalizedOrder ||
      purchasedProductIds.length === 0 ||
      (!hasPurchasedCartItems && !hasPurchasedWishlistItems)
    )
  );

  if (!canShowContent) {
    return (
      <div aria-label="Preparing order confirmation" role="status">
        <CheckoutSuccessSkeleton />
      </div>
    );
  }

  return props.children;
}
