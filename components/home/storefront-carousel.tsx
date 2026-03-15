'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IStorefrontCarouselProps {
  featuredProducts: IProductCard[];
}

export function StorefrontCarousel({ featuredProducts }: IStorefrontCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 3000, stopOnInteraction: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = React.useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onInit = React.useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList());
  }, []);

  const onSelect = React.useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  React.useEffect(() => {
    if (!emblaApi) return;

    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
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
              <Link href={`/products/${product.slug}`} className="block relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] w-full group/slide">
                {/* Background Image */}
                <div className="absolute inset-0 bg-muted/20">
                  {product.images?.[0]?.url && (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover/slide:scale-105"
                    />
                  )}
                </div>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent md:bg-gradient-to-r md:from-background/90 md:via-background/40 md:to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 sm:p-10 md:justify-center md:p-16">
                  <div className="max-w-2xl transition-transform duration-500 ease-out group-hover/slide:translate-x-2">
                    <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary backdrop-blur-sm mb-4">
                      Featured
                    </p>
                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl line-clamp-2 md:line-clamp-3 mb-4 drop-shadow-sm">
                      {product.name}
                    </h2>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-foreground bg-background/80 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm border border-border/50">
                        {formatPrice(product.priceCents, product.currency)}
                      </p>
                      <span className="hidden md:inline-flex items-center text-sm font-semibold text-primary/80 transition-colors group-hover/slide:text-primary bg-background/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-transparent">
                        View Details <ChevronRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
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

      {/* Dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === selectedIndex ? "w-8 bg-primary" : "w-2 bg-primary/40 hover:bg-primary/60"
            )}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
