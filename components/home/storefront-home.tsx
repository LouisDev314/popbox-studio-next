import { StorefrontBottomCta } from '@/components/home/storefront-bottom-cta';
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
    <div className="w-full pb-8">
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

      <div className="container mx-auto w-full px-4 pt-0 md:px-6 lg:px-8">
        <HomeProductSection
          title="Featured"
          products={featured}
          limit={6}
          className="mb-16"
          headerClassName="mb-4 md:mb-6"
          viewAllHref="/collections/featured"
        />

        <HomeProductSection
          title="Trending Now"
          products={trendingNow}
          limit={9}
          viewAllHref="/products?sort=trending"
        />

        <HomeProductSection
          title="Explore More"
          products={allProductsPreview}
          limit={15}
          viewAllHref="/products"
        />
      </div>

      <StorefrontBottomCta />
    </div>
  );
}
