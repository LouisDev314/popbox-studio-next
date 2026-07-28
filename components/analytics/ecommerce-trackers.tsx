'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ICartItem } from '@/interfaces/cart';
import type { IProduct, IProductCard } from '@/interfaces/product';
import {
  ANALYTICS_READY_EVENT,
  type IAnalyticsListContext,
  isAnalyticsReady,
  trackViewCart,
  trackViewItem,
  trackViewItemList,
} from '@/lib/analytics';
import { getCartItemKey } from '@/utils/cart';

function subscribeToAnalyticsReady(onStoreChange: () => void) {
  window.addEventListener(ANALYTICS_READY_EVENT, onStoreChange);
  return () => window.removeEventListener(ANALYTICS_READY_EVENT, onStoreChange);
}

function useAnalyticsReady(): boolean {
  return useSyncExternalStore(
    subscribeToAnalyticsReady,
    isAnalyticsReady,
    () => false,
  );
}

export function ProductViewTracker(props: { product: IProduct }) {
  const isReady = useAnalyticsReady();
  const trackedProductId = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || trackedProductId.current === props.product.id) {
      return;
    }

    if (trackViewItem(props.product)) {
      trackedProductId.current = props.product.id;
    }
  }, [isReady, props.product]);

  return null;
}

export function ProductListViewTracker(props: {
  list: IAnalyticsListContext;
  products: IProductCard[];
}) {
  const isReady = useAnalyticsReady();
  const trackedListKey = useRef<string | null>(null);
  const listKey = useMemo(
    () => `${props.list.id}:${props.products.map((product) => product.id).join(',')}`,
    [props.list.id, props.products],
  );

  useEffect(() => {
    if (!isReady || trackedListKey.current === listKey) {
      return;
    }

    if (trackViewItemList(props.products, props.list)) {
      trackedListKey.current = listKey;
    }
  }, [isReady, listKey, props.list, props.products]);

  return null;
}

export function CartViewTracker(props: { items: ICartItem[] }) {
  const isReady = useAnalyticsReady();
  const trackedCartKey = useRef<string | null>(null);
  const cartKey = useMemo(
    () => props.items.map((item) => `${getCartItemKey(item)}:${item.quantity}`).join(','),
    [props.items],
  );

  useEffect(() => {
    if (!isReady || !cartKey || trackedCartKey.current === cartKey) {
      return;
    }

    if (trackViewCart(props.items)) {
      trackedCartKey.current = cartKey;
    }
  }, [cartKey, isReady, props.items]);

  return null;
}

export { useAnalyticsReady };
