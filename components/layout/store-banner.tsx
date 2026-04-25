'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IStoreBannerItem, IStoreBannerSettings } from '@/interfaces/settings';
import { cn } from '@/lib/utils';

const PUBLIC_STORE_BANNER_QUERY_KEY = ['settings', 'store-banner'] as const;

interface IStoreBannerRowProps {
  banner: IStoreBannerSettings;
  autoRotate?: boolean;
  className?: string;
  showControls?: boolean;
}

interface IStorefrontBannerProps {
  onVisibilityChange?: (isVisible: boolean) => void;
}

export function isVisibleStoreBanner(banner: IStoreBannerSettings | null | undefined): banner is IStoreBannerSettings {
  return getActiveStoreBannerItems(banner).length > 0;
}

export function getActiveStoreBannerItems(
  banner: IStoreBannerSettings | null | undefined,
): IStoreBannerItem[] {
  if (!banner?.enabled) {
    return [];
  }

  return [...banner.items]
    .filter((item) => item.isActive && item.message.trim())
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function StoreBannerLink(props: { item: IStoreBannerItem }) {
  const linkLabel = props.item.linkLabel?.trim() || null;
  const linkHref = props.item.linkHref?.trim() || null;
  const linkClassName = 'shrink-0 font-medium underline underline-offset-4 transition-opacity hover:opacity-85';

  if (!linkLabel || !linkHref) {
    return null;
  }

  if (linkHref.startsWith('/')) {
    return (
      <Link href={linkHref} className={linkClassName}>
        {linkLabel}
      </Link>
    );
  }

  if (linkHref.startsWith('https://')) {
    return (
      <a href={linkHref} target="_blank" rel="noreferrer" className={linkClassName}>
        {linkLabel}
      </a>
    );
  }

  return null;
}

export function StoreBannerRow(props: IStoreBannerRowProps) {
  const {
    autoRotate = true,
    showControls = true,
  } = props;
  const activeItems = useMemo(() => getActiveStoreBannerItems(props.banner), [props.banner]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasMultipleItems = activeItems.length > 1;
  const shouldShowControls = showControls && hasMultipleItems;
  const safeCurrentIndex = activeItems.length > 0 ? currentIndex % activeItems.length : 0;
  const currentItem = activeItems[safeCurrentIndex] ?? null;

  const showPrevious = useCallback(() => {
    setCurrentIndex((previousIndex) => (
      activeItems.length > 0
        ? (previousIndex - 1 + activeItems.length) % activeItems.length
        : 0
    ));
  }, [activeItems.length]);

  const showNext = useCallback(() => {
    setCurrentIndex((previousIndex) => (
      activeItems.length > 0
        ? (previousIndex + 1) % activeItems.length
        : 0
    ));
  }, [activeItems.length]);

  useEffect(() => {
    if (!autoRotate || isPaused || !hasMultipleItems) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      showNext();
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoRotate, hasMultipleItems, isPaused, showNext, currentIndex]);

  if (!currentItem) {
    return null;
  }

  return (
    <div
      aria-label="Store announcement"
      className={cn(
        'border-b border-primary/20 bg-primary text-primary-foreground',
        props.className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="py-1.5 sm:py-2">
        <div
          className={cn(
            'mx-auto grid max-w-7xl items-center gap-2 text-center text-xs font-medium leading-5 tracking-normal sm:text-sm',
            shouldShowControls ? 'grid-cols-[2rem_minmax(0,1fr)_2rem]' : 'grid-cols-1',
          )}
        >
          {shouldShowControls ? (
            <button
              type="button"
              aria-label="Previous announcement"
              className="inline-flex size-4 ml-2 items-center justify-center rounded-full text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/80"
              onClick={showPrevious}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 whitespace-normal break-words">
            <span className="min-w-0 break-words">{currentItem.message.trim()}</span>
            <StoreBannerLink item={currentItem} />
          </div>

          {shouldShowControls ? (
            <button
              type="button"
              aria-label="Next announcement"
              className="inline-flex size-4 mr-2 items-center justify-center rounded-full text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/80"
              onClick={showNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StorefrontBanner(props: IStorefrontBannerProps) {
  const { onVisibilityChange } = props;
  const { data: bannerResponse } = useCustomizeQuery<IStoreBannerSettings>({
    queryKey: PUBLIC_STORE_BANNER_QUERY_KEY,
    queryFn: QueryConfigs.fetchPublicStoreBanner,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const banner = bannerResponse?.data.data ?? null;
  const isVisible = isVisibleStoreBanner(banner);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  if (!isVisible) {
    return null;
  }

  return <StoreBannerRow banner={banner} />;
}
