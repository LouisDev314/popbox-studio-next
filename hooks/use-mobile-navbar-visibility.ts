'use client';

import { useEffect, useRef, useState } from 'react';

interface IUseMobileNavbarVisibilityOptions {
  breakpoint?: string;
  showAtTopOffset?: number;
  toggleThreshold?: number;
}

export function useMobileNavbarVisibility(options?: IUseMobileNavbarVisibilityOptions) {
  const breakpoint = options?.breakpoint ?? '(max-width: 767px)';
  const showAtTopOffset = options?.showAtTopOffset ?? 24;
  const toggleThreshold = options?.toggleThreshold ?? 14;

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const lastToggleScrollYRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(breakpoint);

    const resetVisibility = () => {
      lastScrollYRef.current = window.scrollY;
      lastToggleScrollYRef.current = window.scrollY;
      setIsVisible(true);
    };

    const updateVisibility = () => {
      animationFrameRef.current = null;

      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      if (currentScrollY <= showAtTopOffset) {
        lastScrollYRef.current = currentScrollY;
        lastToggleScrollYRef.current = currentScrollY;
        setIsVisible(true);
        return;
      }

      if (currentScrollY > lastScrollY) {
        const hasPassedHideThreshold = currentScrollY - lastToggleScrollYRef.current >= toggleThreshold;
        if (hasPassedHideThreshold) {
          lastToggleScrollYRef.current = currentScrollY;
          setIsVisible(false);
        }
      } else if (currentScrollY < lastScrollY) {
        const hasPassedShowThreshold = lastToggleScrollYRef.current - currentScrollY >= toggleThreshold;
        if (hasPassedShowThreshold) {
          lastToggleScrollYRef.current = currentScrollY;
          setIsVisible(true);
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(updateVisibility);
    };

    const handleMediaQueryChange = () => {
      resetVisibility();
    };

    resetVisibility();
    window.addEventListener('scroll', handleScroll, { passive: true });
    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mediaQuery.removeEventListener('change', handleMediaQueryChange);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [breakpoint, showAtTopOffset, toggleThreshold]);

  return isVisible;
}
