import Link from 'next/link';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { StorefrontHome } from '@/components/home/storefront-home';
import { Button } from '@/components/ui/button';
import { getPublicHomepageData } from '@/lib/api/public-storefront';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'PopBox Studio',
  description: 'Discover premium anime merchandise and Ichiban Kuji collectibles.',
};

export default async function StoreRootPage() {
  let homeData = null;

  try {
    homeData = await getPublicHomepageData();
  } catch {
    homeData = null;
  }

  if (!homeData) {
    return (
      <div className="container mx-auto flex min-h-[60vh] w-full items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-border/70 bg-card px-8 py-14 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-destructive">
            Failed to load content
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            The storefront homepage data is temporarily unavailable. Product browsing is still
            available.
          </p>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <StorefrontHome homeData={homeData} />;
}
