import { StorefrontBottomCta } from '@/components/home/storefront-bottom-cta';
import { HomeProductSection } from '@/components/home/home-product-section';
import { StorefrontFeaturedCarouselClient } from '@/components/home/storefront-featured-carousel-client';
import { StorefrontHero } from '@/components/home/storefront-hero';
import { StorefrontValueProps } from '@/components/home/storefront-value-props';
import type { IHomepageData } from '@/interfaces/home';

interface IStorefrontHomeProps {
  homeData: IHomepageData;
}

export function StorefrontHome(props: IStorefrontHomeProps) {
  const { featured, trendingNow, allProductsPreview } = props.homeData;
  const hasFeatured = featured.length > 0;

  return (
    <div className="w-full pb-8 md:py-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
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
        </div>
      </div>

      <StorefrontValueProps />

      <div className="container mx-auto w-full px-4 pt-0 sm:px-6 lg:px-8">
        <HomeProductSection
          title="Featured"
          products={featured}
          variant="featured-card"
          viewAllHref="/collections/featured"
        />

        <HomeProductSection
          title="Trending Now"
          products={trendingNow}
          variant="dense-grid"
          viewAllHref="/products?sort=trending"
        />

        <HomeProductSection
          title="More to Explore"
          products={allProductsPreview}
          variant="dense-grid"
          viewAllHref="/products"
        />
      </div>

      <StorefrontBottomCta />
    </div>
  );
}
