'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeProductSection } from '@/components/home/home-product-section';
import { StorefrontHero } from '@/components/home/storefront-hero';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { type IHomepageData } from '@/interfaces/home';

function HomePageSkeleton() {
  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-14 min-h-[420px] rounded-[2.25rem] bg-muted/30 md:min-h-[500px]" />
      <div className="space-y-14">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index}>
            <div className="mb-8">
              <div className="h-4 w-28 rounded-full bg-muted/30" />
              <div className="mt-3 h-9 w-56 rounded-full bg-muted/35" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <div key={cardIndex} className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card p-4">
                  <div className="aspect-square rounded-[1.4rem] bg-muted/35" />
                  <div className="mt-4 h-5 rounded-full bg-muted/35" />
                  <div className="mt-2 h-4 w-2/3 rounded-full bg-muted/25" />
                  <div className="mt-6 h-5 w-1/3 rounded-full bg-muted/35" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function StorefrontHomePage() {
  const { data: response, isPending, isError } = useCustomizeQuery<IHomepageData>({
    queryKey: ['homepage-data'],
    queryFn: () => QueryConfigs.fetchHomePage(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const homeData = response?.data?.data;

  if (isPending) {
    return <HomePageSkeleton />;
  }

  if (isError || !homeData) {
    return (
      <div className="container mx-auto flex min-h-[60vh] w-full items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-border/70 bg-card px-8 py-14 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-destructive">Failed to load content</h2>
          <p className="mt-3 text-base text-muted-foreground">
            The storefront homepage data is temporarily unavailable. Product browsing is still available.
          </p>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { featured, trendingNow, allProductsPreview } = homeData;

  return (
    <div className="container mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <StorefrontHero
        title="Discover Premium Collectibles"
        subtitle="Your exclusive source for Ichiban Kuji and authentic anime figures."
        ctaText="Shop Now"
        ctaLink="/products"
      />

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
