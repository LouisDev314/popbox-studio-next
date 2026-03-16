'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { IProductCard } from '@/interfaces/product';
import { cn } from '@/utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmblaCarouselType } from 'embla-carousel';

interface IStorefrontCarouselProps {
  featuredProducts: IProductCard[];
}

export function StorefrontCarousel(props: IStorefrontCarouselProps) {
  const { featuredProducts } = props;

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
    if (!emblaApi) return;

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

  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="relative mb-14 overflow-hidden rounded-[2.25rem] border border-border/60 bg-card shadow-sm md:mb-16 group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {featuredProducts.map((product) => (
            <div key={product.id} className="relative flex-[0_0_100%] min-w-0">
              {/* Background Image */}
              <Link
                href={`/products/${product.slug}`}
                className="block relative aspect-[4/3] sm:aspect-[16/9] w-full group/slide"
                onClick={() => autoplay.current.stop()}
              >
                <div className="absolute inset-0 bg-muted/20">
                  {product.images?.[0]?.url && (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={1000}
                      height={1000}
                      className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover/slide:scale-105"
                    />
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-y-0 left-4 right-4 items-center justify-between pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden md:flex z-20">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm pointer-events-auto shadow-md border-border/50 hover:bg-background hover:scale-105 transition-transform"
          onClick={scrollPrev}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm pointer-events-auto shadow-md border-border/50 hover:bg-background hover:scale-105 transition-transform"
          onClick={scrollNext}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === selectedIndex ? 'w-8 bg-primary' : 'w-2 bg-primary/40 hover:bg-primary/60',
            )}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
