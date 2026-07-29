'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface IUseInfiniteScrollSentinelOptions {
  enabled?: boolean;
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isError?: boolean;
  isFetchingNextPage: boolean;
  root?: Element | null;
  rootMargin?: string;
}

export function useInfiniteScrollSentinel({
  enabled = true,
  fetchNextPage,
  hasNextPage,
  isError = false,
  isFetchingNextPage,
  root = null,
  rootMargin = '200px 0px',
}: IUseInfiniteScrollSentinelOptions) {
  const [sentinel, setSentinel] = useState<Element | null>(null);
  const fetchNextPageRef = useRef(fetchNextPage);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !sentinel
      || !enabled
      || !hasNextPage
      || isError
      || isFetchingNextPage
      || typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (
        !mountedRef.current
        || requestInFlightRef.current
        || !entries.some((entry) => entry.isIntersecting)
      ) {
        return;
      }

      requestInFlightRef.current = true;
      void Promise.resolve(fetchNextPageRef.current())
        .catch(() => undefined)
        .finally(() => {
          requestInFlightRef.current = false;
        });
    }, {
      root,
      rootMargin,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    enabled,
    hasNextPage,
    isError,
    isFetchingNextPage,
    root,
    rootMargin,
    sentinel,
  ]);

  return useCallback((node: Element | null) => {
    setSentinel(node);
  }, []);
}
