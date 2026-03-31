import Link from 'next/link';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { StorefrontHome } from '@/components/home/storefront-home';
import { Button } from '@/components/ui/button';
import { getPublicHomepageData } from '@/lib/api/public-storefront';
import {
  BRAND_NAME,
  buildAbsoluteUrl,
  createPageMetadata,
  truncateMetaDescription,
} from '@/lib/seo';

export const revalidate = 300;

const HOME_PAGE_DESCRIPTION = truncateMetaDescription(
  'Shop PopBox Studio for anime merchandise, anime collectibles, figures, plushies, cards, gifts, and Ichiban Kuji online from a premium collector-focused anime store in Canada.',
  165,
);

export const metadata: Metadata = createPageMetadata({
  absoluteTitle: 'PopBox Studio | Anime Merchandise, Collectibles & Ichiban Kuji',
  description: HOME_PAGE_DESCRIPTION,
  path: '/',
});

export default async function StoreRootPage() {
  let homeData = null;

  try {
    homeData = await getPublicHomepageData();
  } catch {
    homeData = null;
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: buildAbsoluteUrl('/'),
    description: HOME_PAGE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${buildAbsoluteUrl('/search/results')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  if (!homeData) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <StorefrontHome homeData={homeData} />
    </>
  );
}
