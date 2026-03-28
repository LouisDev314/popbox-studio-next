import { HomeProductSection } from '@/components/home/home-product-section';
import { StorefrontFeaturedCarouselClient } from '@/components/home/storefront-featured-carousel-client';
import { StorefrontHero } from '@/components/home/storefront-hero';
import type { IHomepageData } from '@/interfaces/home';

interface IStorefrontHomeProps {
  homeData: IHomepageData;
}

export function StorefrontHome(props: IStorefrontHomeProps) {
  const { featured, trendingNow, allProductsPreview } = props.homeData;
  const hasFeatured = featured.length > 0;

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      {hasFeatured ? (
        <StorefrontFeaturedCarouselClient featuredProducts={featured} />
      ) : (
        <StorefrontHero
          title="Discover Premium Collectibles"
          subtitle="Your exclusive source for Ichiban Kuji and authentic anime figures."
          ctaText="Shop Now"
          ctaLink="/products"
        />
      )}

      <HomeProductSection
        title="Featured"
        products={featured}
        viewAllHref="/collections/featured"
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
