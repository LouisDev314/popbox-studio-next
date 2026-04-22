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

function areNumberArraysEqual(first: number[], second: number[]) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
}

export function StorefrontFeaturedCarouselClient(props: IStorefrontFeaturedCarouselClientProps) {
  const [carouselState, setCarouselState] = useState<IStorefrontCarouselState | null>(null);

  const handleCarouselStateChange = useCallback((state: IStorefrontCarouselState) => {
    setCarouselState((currentState) => {
      if (
        currentState &&
        currentState.selectedIndex === state.selectedIndex &&
        currentState.scrollTo === state.scrollTo &&
        currentState.scrollPrev === state.scrollPrev &&
        currentState.scrollNext === state.scrollNext &&
        areNumberArraysEqual(currentState.scrollSnaps, state.scrollSnaps)
      ) {
        return currentState;
      }

      return state;
    });
  }, []);

  if (props.featuredProducts.length === 0) {
    return null;
  }

  return (
    <section>
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
