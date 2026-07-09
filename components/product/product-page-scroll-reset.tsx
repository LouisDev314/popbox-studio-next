'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const PRODUCT_DETAIL_PATH_PATTERN = /^\/products\/[^/]+$/;

export function ProductPageScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!PRODUCT_DETAIL_PATH_PATTERN.test(pathname)) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [pathname]);

  return null;
}
