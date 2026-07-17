import { StorefrontBottomCta } from '@/components/home/storefront-bottom-cta';
import { HomeProductSection } from '@/components/home/home-product-section';
import { StorefrontFeaturedCarouselClient } from '@/components/home/storefront-featured-carousel-client';
import { StorefrontHero } from '@/components/home/storefront-hero';
import { StorefrontKujiBanner } from '@/components/home/storefront-kuji-banner';
import { StorefrontWelcome } from '@/components/home/storefront-welcome';
import type { IHomepageData } from '@/interfaces/home';

interface IStorefrontHomeProps {
  homeData: IHomepageData;
}

export function StorefrontHome(props: IStorefrontHomeProps) {
  const { featured, trendingNow, allProductsPreview } = props.homeData;
  const hasFeatured = featured.length > 0;

  return (
    <div className="w-full">
      {hasFeatured ? (
        <>
          <h1 className="sr-only">
            PopBox Studio anime merchandise and Ichiban Kuji
          </h1>
          <StorefrontFeaturedCarouselClient featuredProducts={featured} />
        </>
      ) : (
        <StorefrontHero
          title="Discover Anime Merchandise"
          subtitle="Your exclusive source for Ichiban Kuji and authentic anime merchandise."
          ctaText="Shop Now"
          ctaLink="/products"
        />
      )}

      <StorefrontWelcome />

      <div className="container mx-auto w-full px-4 pt-0 md:px-6 lg:px-8">
        <HomeProductSection
          listId="home_featured"
          title="Featured"
          products={featured}
          limit={8}
          className="mb-16"
          headerClassName="mb-4 md:mb-6"
          viewAllHref="/collections/featured"
        />
      </div>

      <StorefrontKujiBanner />

      <div className="container mx-auto w-full px-4 pt-0 md:px-6 lg:px-8">
        <HomeProductSection
          listId="home_trending"
          title="Trending Now"
          products={trendingNow}
          limit={8}
          viewAllHref="/products?sort=trending"
        />

        <HomeProductSection
          listId="home_explore_more"
          title="Explore More"
          products={allProductsPreview}
          limit={16}
          viewAllHref="/products"
        />
      </div>

      <StorefrontBottomCta />
    </div>
  );
}
