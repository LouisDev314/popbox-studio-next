'use client';

import useEmblaCarousel from 'embla-carousel-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IStoreBannerItem, IStoreBannerSettings } from '@/interfaces/settings';
import { cn } from '@/lib/utils';

const PUBLIC_STORE_BANNER_QUERY_KEY = ['settings', 'store-banner'] as const;
const AUTO_PLAY_MS = 5000;

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

function StoreBannerMessage(props: { item: IStoreBannerItem }) {
  const message = props.item.message.trim();
  const linkHref = props.item.linkHref?.trim() || null;
  const textClassName = 'min-w-0 whitespace-normal break-words text-center';
  const linkClassName = cn(
    textClassName,
    'underline underline-offset-4 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/80',
  );

  if (!linkHref) {
    return <span className={textClassName}>{message}</span>;
  }

  if (linkHref.startsWith('/')) {
    return (
      <Link href={linkHref} className={linkClassName}>
        {message}
      </Link>
    );
  }

  if (linkHref.startsWith('https://')) {
    return (
      <a href={linkHref} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {message}
      </a>
    );
  }

  return <span className={textClassName}>{message}</span>;
}

export function StoreBannerRow(props: IStoreBannerRowProps) {
  const activeItems = useMemo(() => getActiveStoreBannerItems(props.banner), [props.banner]);

  if (activeItems.length === 0) {
    return null;
  }

  if (activeItems.length === 1) {
    return (
      <StoreBannerShell className={props.className}>
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 text-center text-xs font-medium leading-5 tracking-normal sm:text-sm">
          <StoreBannerMessage item={activeItems[0]} />
        </div>
      </StoreBannerShell>
    );
  }

  return (
    <StoreBannerCarousel
      autoRotate={props.autoRotate}
      className={props.className}
      items={activeItems}
      showControls={props.showControls}
    />
  );
}

function StoreBannerShell(props: {
  children: ReactNode;
  className?: string;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      aria-label="Store announcement"
      className={cn(
        'border-b border-primary/20 bg-primary py-2 text-primary-foreground sm:py-2.5',
        props.className,
      )}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {props.children}
    </div>
  );
}

function StoreBannerCarousel(props: {
  autoRotate?: boolean;
  className?: string;
  items: IStoreBannerItem[];
  showControls?: boolean;
}) {
  const {
    autoRotate = true,
    showControls = true,
  } = props;
  const emblaOptions = useMemo(
    () => ({
      loop: true,
      align: 'start' as const,
      slidesToScroll: 1,
    }),
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [isPaused, setIsPaused] = useState(false);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const resetAutoPlayTimer = useCallback(() => {
    setTimerResetKey((current) => current + 1);
  }, []);

  const showPrevious = useCallback(() => {
    emblaApi?.scrollPrev();
    resetAutoPlayTimer();
  }, [emblaApi, resetAutoPlayTimer]);

  const showNext = useCallback(() => {
    emblaApi?.scrollNext();
    resetAutoPlayTimer();
  }, [emblaApi, resetAutoPlayTimer]);

  useEffect(() => {
    if (!autoRotate || isPaused || !emblaApi) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTO_PLAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRotate, emblaApi, isPaused, timerResetKey]);

  return (
    <StoreBannerShell
      className={props.className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={cn(
          'mx-auto grid max-w-7xl items-center gap-2 px-2 text-center text-xs font-medium leading-5 tracking-normal sm:text-sm',
          showControls ? 'grid-cols-[2rem_minmax(0,1fr)_2rem]' : 'grid-cols-1',
        )}
      >
        {showControls ? (
          <div className="flex justify-start">
            <button
              type="button"
              aria-label="Previous announcement"
              className="inline-flex size-4 items-center justify-center rounded-full text-primary-foreground/85 transition-colors"
              onClick={showPrevious}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="min-w-0 overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {props.items.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 flex-[0_0_100%] items-center justify-center px-2 whitespace-normal break-words text-center"
              >
                <StoreBannerMessage item={item} />
              </div>
            ))}
          </div>
        </div>

        {showControls ? (
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Next announcement"
              className="inline-flex size-4 items-center justify-center rounded-full text-primary-foreground/85 transition-colors"
              onClick={showNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </StoreBannerShell>
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
