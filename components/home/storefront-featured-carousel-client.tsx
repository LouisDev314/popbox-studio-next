'use client';

import { useCallback, useState } from 'react';
import {
  StorefrontCarousel,
  type IStorefrontCarouselState,
} from '@/components/home/storefront-carousel';
import { StorefrontCarouselDots } from '@/components/home/storefront-carousel-dots';
import type { IProductCard } from '@/interfaces/product';

interface IStorefrontFeaturedCarouselClientProps {
  featuredProducts: IProductCard[];
}

export function StorefrontFeaturedCarouselClient(props: IStorefrontFeaturedCarouselClientProps) {
  const [carouselState, setCarouselState] = useState<IStorefrontCarouselState | null>(null);

  const handleCarouselStateChange = useCallback((state: IStorefrontCarouselState) => {
    setCarouselState(state);
  }, []);

  if (props.featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="mb-7 md:mb-12">
      <StorefrontCarousel
        featuredProducts={props.featuredProducts}
        onStateChange={handleCarouselStateChange}
      />

      <StorefrontCarouselDots
        className="mt-3 md:mt-4"
        selectedIndex={carouselState?.selectedIndex ?? 0}
        scrollSnaps={carouselState?.scrollSnaps ?? []}
        onDotClick={(index) => {
          carouselState?.scrollTo(index);
        }}
      />
    </section>
  );
}
