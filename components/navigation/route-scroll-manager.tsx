'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_SCROLL_CONTAINER_SELECTOR = '[data-route-scroll-container]';

export type ScrollTarget = Window | HTMLElement;

export function getRouteScrollTarget(): ScrollTarget {
  const routeContainer = document.querySelector<HTMLElement>(ROUTE_SCROLL_CONTAINER_SELECTOR);

  if (routeContainer) {
    return routeContainer;
  }

  const documentScroller = document.scrollingElement;

  if (documentScroller instanceof HTMLElement && typeof documentScroller.scrollTo === 'function') {
    return documentScroller;
  }

  // window.scrollTo remains the safest fallback for older Safari document-scroller behavior.
  return window;
}

export function scrollRouteTargetToTop(target: ScrollTarget = getRouteScrollTarget()) {
  target.scrollTo({
    top: 0,
    left: 0,
    behavior: 'auto',
  });
}

export function RouteScrollManager() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const pendingHistoryPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      // Keep history.scrollRestoration under browser control. Matching the committed
      // pathname lets native Back/Forward restoration win without affecting later pushes.
      pendingHistoryPathnameRef.current = window.location.pathname;
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useLayoutEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (previousPathname === null || previousPathname === pathname) {
      return;
    }

    const isHistoryTraversal = pendingHistoryPathnameRef.current === pathname;
    pendingHistoryPathnameRef.current = null;

    if (isHistoryTraversal || window.location.hash) {
      return;
    }

    scrollRouteTargetToTop();
  }, [pathname]);

  return null;
}
