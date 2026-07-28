'use client';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import { CheckoutSuccessSkeleton } from '@/components/store/storefront-page-skeletons';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IOrderDetail } from '@/interfaces/order';
import {
  getPurchasedLineIdentitiesFromOrder,
  getPurchasedProductIdsFromOrder,
  isFinalizedCheckoutOrder,
} from '@/utils/checkout';
import { getCartItemKey, getCartLineKey } from '@/utils/cart';
import { useAnalyticsReady } from '@/components/analytics/ecommerce-trackers';
import { trackPurchaseOnce } from '@/lib/analytics';

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

const CHECKOUT_FINALIZATION_RETRY_DELAY_MS = 1_500;
const CHECKOUT_FINALIZATION_MAX_ATTEMPTS = 6;

export function CheckoutSuccessFinalizing(props: { message: string; sessionId: string }) {
  const router = useRouter();
  const [isRetryExhausted, setIsRetryExhausted] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const pollForFinalizedOrder = async () => {
      try {
        const response = await QueryConfigs.fetchCheckoutSuccess(props.sessionId);
        const successData = response.data.data;

        if (!successData.pending && successData.order) {
          router.refresh();
          return;
        }
      } catch {
        // A webhook may still be committing the order. Continue the bounded retry below.
      }

      attempts += 1;

      if (isCancelled) {
        return;
      }

      if (attempts >= CHECKOUT_FINALIZATION_MAX_ATTEMPTS) {
        setIsRetryExhausted(true);
        return;
      }

      timeoutId = window.setTimeout(pollForFinalizedOrder, CHECKOUT_FINALIZATION_RETRY_DELAY_MS);
    };

    void pollForFinalizedOrder();

    return () => {
      isCancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [props.sessionId, router]);

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold text-foreground">Finalizing your order…</h1>
      <p className="max-w-xl text-muted-foreground">
        {props.message}
      </p>
      {isRetryExhausted ? (
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          Your order is taking a little longer than expected. You can safely refresh this page, or contact support if it persists.
        </p>
      ) : null}
    </>
  );
}

export function CheckoutSuccessEffects(props: ICheckoutSuccessEffectsProps) {
  const isAnalyticsReady = useAnalyticsReady();
  const purchasedProductIds = useMemo(() => getPurchasedProductIdsFromOrder(props.order), [props.order]);
  const purchasedLineIdentities = useMemo(
    () => getPurchasedLineIdentitiesFromOrder(props.order),
    [props.order],
  );
  const purchasedLineKeySet = useMemo(
    () => new Set(purchasedLineIdentities.map(getCartLineKey)),
    [purchasedLineIdentities],
  );
  const purchasedProductIdSet = useMemo(() => new Set(purchasedProductIds), [purchasedProductIds]);
  const isFinalizedOrder = isFinalizedCheckoutOrder(props.order);

  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const hasPurchasedCartItems = useCartStore((state) => (
    state.items.some((item) => purchasedLineKeySet.has(getCartItemKey(item)))
  ));
  const removePurchasedLines = useCartStore((state) => state.removePurchasedLines);
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
  const hasTrackedPurchase = useRef(false);

  useEffect(() => {
    if (!isAnalyticsReady || hasTrackedPurchase.current) {
      return;
    }

    if (trackPurchaseOnce(props.order)) {
      hasTrackedPurchase.current = true;
    }
  }, [isAnalyticsReady, props.order]);

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
    removePurchasedLines(purchasedLineIdentities);
    removeWishlistItems(purchasedProductIds);
    hasCleanedUp.current = true;
    markCheckoutSuccessCleanupComplete(props.sessionId);
  }, [
    hasCartHydrated,
    hasWishlistHydrated,
    isFinalizedOrder,
    markCheckoutSuccessCleanupComplete,
    purchasedProductIds,
    purchasedLineIdentities,
    props.sessionId,
    removePurchasedLines,
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
