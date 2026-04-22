'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { cn, formatPrice } from '@/lib/utils';
import { IProductCard } from '@/interfaces/product';

interface IStorefrontCarouselProps {
  featuredProducts: IProductCard[];
  className?: string;
  onStateChange?: (state: IStorefrontCarouselState) => void;
}

export interface IStorefrontCarouselState {
  selectedIndex: number;
  scrollSnaps: number[];
  scrollTo: (index: number) => void;
  scrollPrev: () => void;
  scrollNext: () => void;
}

function getCarouselEyebrowLabel(product: IProductCard) {
  if (product.productType === 'kuji') {
    return 'Ichiban Kuji';
  }

  return product.collection?.name ?? 'PopBox Studio Pick';
}

function areNumberArraysEqual(first: number[], second: number[]) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
}

export function StorefrontCarousel(props: IStorefrontCarouselProps) {
  const { featuredProducts, className, onStateChange } = props;

  const autoplay = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
    }),
  );
  const lastReportedState = useRef<IStorefrontCarouselState | null>(null);
  const emblaOptions = useMemo(
    () => ({
      loop: true,
      align: 'start' as const,
      slidesToScroll: 1,
    }),
    [],
  );
  const emblaPlugins = useMemo(() => [autoplay.current], []);

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, emblaPlugins);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    autoplay.current.stop();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    autoplay.current.stop();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      autoplay.current.stop();
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
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
      return;
    }

    syncScrollSnaps(emblaApi);
    syncSelectedIndex(emblaApi);

    emblaApi.on('reInit', syncScrollSnaps);
    emblaApi.on('reInit', syncSelectedIndex);
    emblaApi.on('select', syncSelectedIndex);

    return () => {
      emblaApi.off('reInit', syncScrollSnaps);
      emblaApi.off('reInit', syncSelectedIndex);
      emblaApi.off('select', syncSelectedIndex);
    };
  }, [emblaApi, syncScrollSnaps, syncSelectedIndex]);

  useEffect(() => {
    if (!onStateChange) {
      return;
    }

    const nextState = {
      selectedIndex,
      scrollSnaps,
      scrollTo,
      scrollPrev,
      scrollNext,
    };
    const previousState = lastReportedState.current;

    if (
      previousState &&
      previousState.selectedIndex === nextState.selectedIndex &&
      previousState.scrollTo === nextState.scrollTo &&
      previousState.scrollPrev === nextState.scrollPrev &&
      previousState.scrollNext === nextState.scrollNext &&
      areNumberArraysEqual(previousState.scrollSnaps, nextState.scrollSnaps)
    ) {
      return;
    }

    lastReportedState.current = nextState;
    onStateChange(nextState);
  }, [onStateChange, scrollNext, scrollPrev, scrollSnaps, scrollTo, selectedIndex]);

  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'group relative overflow-hidden bg-background',
        className,
      )}
    >
      <div className="w-full overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {featuredProducts.map((product, index) => {
            return (
              <div
                key={product.id}
                className="relative min-w-0 flex-[0_0_100%]"
              >
                <div className="relative lg:flex lg:w-full lg:justify-center">
                  <Link
                    href={`/products/${product.slug}`}
                    className="group/slide relative block w-full"
                    onClick={() => autoplay.current.stop()}
                  >
                    <div className="relative aspect-[1.85/1] w-full overflow-hidden sm:aspect-[2/1]">
                      <div className="absolute inset-0">
                        <StorefrontImage
                          src={product.images?.[0]?.url}
                          alt={product.images?.[0]?.altText ?? product.name}
                          label={product.name}
                          priority={index === 0}
                          sizes="(min-width: 1280px) 1152px, (min-width: 1024px) calc(100vw - 128px), 100vw"
                          className="h-full w-full bg-[radial-gradient(circle_at_20%_0%,rgba(244,162,28,0.18),transparent_34%),linear-gradient(160deg,#17110d_0%,#2b1d13_54%,#110d0a_100%)] lg:bg-none"
                          imageClassName="object-cover object-center transition-transform duration-700 ease-out group-hover/slide:scale-[1.02]"
                          fallbackClassName="border-white/15 bg-white/10 text-white/82 shadow-none backdrop-blur-sm"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 via-45% to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 text-white sm:px-7 sm:pb-6 sm:pt-20 lg:px-10 lg:pb-9 lg:pt-20 xl:px-12 xl:pb-10">
                        <div className="min-w-0">
                          <p className="mb-2 text-[10px] font-semibold tracking-[0.28em] text-white/72 uppercase sm:mb-3 sm:text-xs">
                            {getCarouselEyebrowLabel(product)}
                          </p>
                          <p className="line-clamp-2 text-2xl leading-[0.98] font-semibold tracking-[-0.03em] sm:text-3xl md:text-4xl">
                            {product.name}
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-white/78 sm:mt-2 sm:text-base">
                            {formatPrice(product.priceCents, product.currency)}
                          </p>
                        </div>
                      </div>

                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
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
