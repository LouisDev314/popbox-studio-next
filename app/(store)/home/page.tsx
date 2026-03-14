'use client';

import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { StorefrontHero } from '@/components/home/storefront-hero';
import { ProductCard } from '@/components/product/product-card';
import { Loader2 } from 'lucide-react';
import { IHomepageData } from '@/interfaces/home';
import { IProductCard } from '@/interfaces/product';

export default function StorefrontHomePage() {
  const { data: response, isPending, isError } = useCustomizeQuery<IHomepageData>({
    queryKey: ['homepage-data'],
    queryFn: () => QueryConfigs.fetchHomePage(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const homeData = response?.data?.data;

  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !homeData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold text-destructive">Failed to load content</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const { featured, trendingNow, allProductsPreview } = homeData;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <StorefrontHero
        title="Discover Premium Collectibles" 
        subtitle="Your exclusive source for Ichiban Kuji and authentic anime figures."
        ctaText="Shop Now"
        ctaLink="/products"
      />

      {featured && featured.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Featured Prizes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.slice(0, 4).map((product: IProductCard) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {trendingNow && trendingNow.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingNow.slice(0, 4).map((product: IProductCard) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {allProductsPreview && allProductsPreview.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">More to Explore</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allProductsPreview.slice(0, 8).map((product: IProductCard) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
