'use client';

import type { EmblaCarouselType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StorefrontCarouselDots } from '@/components/home/storefront-carousel-dots';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AUTO_PLAY_DELAY_MS = 3000;
const AUTO_PLAY_START_DELAY_MS = 7000;

interface IStorefrontCarouselClientProps {
  children: ReactNode;
  className?: string;
  slideCount: number;
}

function areNumberArraysEqual(first: number[], second: number[]) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
}

export function StorefrontCarouselClient(props: IStorefrontCarouselClientProps) {
  const hasUserInteractedRef = useRef(false);
  const autoplayStartTimeoutRef = useRef<number | null>(null);
  const autoplayIntervalRef = useRef<number | null>(null);
  const emblaOptions = useMemo(
    () => ({
      loop: true,
      align: 'start' as const,
      slidesToScroll: 1,
    }),
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const clearAutoplay = useCallback(() => {
    if (autoplayStartTimeoutRef.current !== null) {
      window.clearTimeout(autoplayStartTimeoutRef.current);
      autoplayStartTimeoutRef.current = null;
    }

    if (autoplayIntervalRef.current !== null) {
      window.clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    }
  }, []);

  const stopAutoplay = useCallback(() => {
    hasUserInteractedRef.current = true;
    clearAutoplay();
  }, [clearAutoplay]);

  const scrollPrev = useCallback(() => {
    stopAutoplay();
    emblaApi?.scrollPrev();
  }, [emblaApi, stopAutoplay]);

  const scrollNext = useCallback(() => {
    stopAutoplay();
    emblaApi?.scrollNext();
  }, [emblaApi, stopAutoplay]);

  const scrollTo = useCallback(
    (index: number) => {
      stopAutoplay();
      emblaApi?.scrollTo(index);
    },
    [emblaApi, stopAutoplay],
  );

  const syncScrollSnaps = useCallback((api: EmblaCarouselType) => {
    const nextScrollSnaps = api.scrollSnapList();

    setScrollSnaps((currentScrollSnaps) =>
      areNumberArraysEqual(currentScrollSnaps, nextScrollSnaps)
        ? currentScrollSnaps
        : nextScrollSnaps,
    );
  }, []);

  const syncSelectedIndex = useCallback((api: EmblaCarouselType) => {
    const nextSelectedIndex = api.selectedScrollSnap();

    setSelectedIndex((currentSelectedIndex) =>
      currentSelectedIndex === nextSelectedIndex ? currentSelectedIndex : nextSelectedIndex,
    );
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return undefined;
    }

    const initialSyncFrameId = window.requestAnimationFrame(() => {
      syncScrollSnaps(emblaApi);
      syncSelectedIndex(emblaApi);
    });

    emblaApi.on('reInit', syncScrollSnaps);
    emblaApi.on('reInit', syncSelectedIndex);
    emblaApi.on('select', syncSelectedIndex);

    return () => {
      emblaApi.off('reInit', syncScrollSnaps);
      emblaApi.off('reInit', syncSelectedIndex);
      emblaApi.off('select', syncSelectedIndex);
      window.cancelAnimationFrame(initialSyncFrameId);
    };
  }, [emblaApi, syncScrollSnaps, syncSelectedIndex]);

  useEffect(() => {
    if (!emblaApi || props.slideCount <= 1) {
      return undefined;
    }

    const reduceMotionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (reduceMotionQuery?.matches) {
      return undefined;
    }

    autoplayStartTimeoutRef.current = window.setTimeout(() => {
      if (hasUserInteractedRef.current) {
        return;
      }

      autoplayIntervalRef.current = window.setInterval(() => {
        if (!hasUserInteractedRef.current && document.visibilityState === 'visible') {
          emblaApi.scrollNext();
        }
      }, AUTO_PLAY_DELAY_MS);
    }, AUTO_PLAY_START_DELAY_MS);

    return clearAutoplay;
  }, [clearAutoplay, emblaApi, props.slideCount]);

  if (props.slideCount === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'group relative overflow-hidden bg-background',
        props.className,
      )}
    >
      <div
        className="w-full overflow-hidden"
        ref={emblaRef}
        onMouseDown={stopAutoplay}
        onTouchStart={stopAutoplay}
      >
        <div className="flex touch-pan-y">
          {props.children}
        </div>
      </div>

      <StorefrontCarouselDots
        className="mt-3 md:mt-4"
        selectedIndex={selectedIndex}
        scrollSnaps={scrollSnaps}
        onDotClick={scrollTo}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-12 z-20 hidden justify-center xl:flex"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white/85 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.8)] backdrop-blur-sm motion-safe:animate-bounce motion-reduce:animate-none">
          <ChevronDown className="h-5 w-5" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-4 right-4 z-20 hidden items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex lg:left-0 lg:right-0 lg:w-full lg:px-10">
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto h-12 w-12 rounded-full border-border bg-white text-foreground shadow-sm transition-transform hover:scale-105 hover:bg-muted"
          onClick={scrollPrev}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto h-12 w-12 rounded-full border-border bg-white text-foreground shadow-sm transition-transform hover:scale-105 hover:bg-muted"
          onClick={scrollNext}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </section>
  );
}
