'use client';

import { useCallback, useState } from 'react';
import { HomeProductSection } from '@/components/home/home-product-section';
import {
  StorefrontCarousel,
  type IStorefrontCarouselState,
} from '@/components/home/storefront-carousel';
import { StorefrontCarouselDots } from '@/components/home/storefront-carousel-dots';
import { StorefrontHero } from '@/components/home/storefront-hero';
import type { IHomepageData } from '@/interfaces/home';

interface IStorefrontHomeClientProps {
  homeData: IHomepageData;
}

export function StorefrontHomeClient(props: IStorefrontHomeClientProps) {
  const [carouselState, setCarouselState] = useState<IStorefrontCarouselState | null>(null);

  const handleCarouselStateChange = useCallback((state: IStorefrontCarouselState) => {
    setCarouselState(state);
  }, []);

  const { featured, trendingNow, allProductsPreview } = props.homeData;
  const hasFeatured = featured.length > 0;

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      {hasFeatured ? (
        <section className="mb-14 md:mb-16">
          <StorefrontCarousel
            featuredProducts={featured}
            onStateChange={handleCarouselStateChange}
          />

          <StorefrontCarouselDots
            className="mt-4"
            selectedIndex={carouselState?.selectedIndex ?? 0}
            scrollSnaps={carouselState?.scrollSnaps ?? []}
            onDotClick={(index) => {
              carouselState?.scrollTo(index);
            }}
          />
        </section>
      ) : (
        <StorefrontHero
          title="Discover Premium Collectibles"
          subtitle="Your exclusive source for Ichiban Kuji and authentic anime figures."
          ctaText="Shop Now"
          ctaLink="/products"
        />
      )}

      <HomeProductSection
        title="Featured Prizes"
        products={featured}
        viewAllHref="/products"
      />

      <HomeProductSection
        title="Trending Now"
        products={trendingNow}
        viewAllHref="/products"
      />

      <HomeProductSection
        title="More to Explore"
        products={allProductsPreview}
        viewAllHref="/products"
      />
    </div>
  );
}
