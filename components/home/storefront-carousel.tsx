'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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

export function StorefrontCarousel(props: IStorefrontCarouselProps) {
  const { featuredProducts, className, onStateChange } = props;

  const autoplay = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
    }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [autoplay.current],
  );

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

  const onInit = useCallback((api: EmblaCarouselType) => {
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    onInit(emblaApi);
    onSelect(emblaApi);

    emblaApi.on('reInit', onInit);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);

    return () => {
      emblaApi.off('reInit', onInit);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onInit, onSelect]);

  useEffect(() => {
    if (!onStateChange) {
      return;
    }

    onStateChange({
      selectedIndex,
      scrollSnaps,
      scrollTo,
      scrollPrev,
      scrollNext,
    });
  }, [onStateChange, scrollNext, scrollPrev, scrollSnaps, scrollTo, selectedIndex]);

  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'group relative overflow-hidden border-y border-border/60 bg-card md:rounded-[2rem] md:border',
        className,
      )}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {featuredProducts.map((product) => (
            <div key={product.id} className="relative min-w-0 flex-[0_0_100%]">
              <Link
                href={`/products/${product.slug}`}
                className="group/slide relative block aspect-[4/3] w-full md:aspect-[21/9]"
                onClick={() => autoplay.current.stop()}
              >
                <div className="absolute inset-0 bg-muted/20">
                  {product.images?.[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={1600}
                      height={900}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/slide:scale-105"
                    />
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 py-5 text-white sm:px-7 sm:py-6">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xl font-semibold tracking-tight sm:text-2xl">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/90 sm:text-base">
                      {formatPrice(product.priceCents, product.currency)}
                    </p>
                  </div>
                  {/*<span className="shrink-0 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-medium text-white transition-colors group-hover/slide:bg-white/20">*/}
                  {/*  Shop Now*/}
                  {/*</span>*/}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-4 right-4 z-20 hidden items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
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
