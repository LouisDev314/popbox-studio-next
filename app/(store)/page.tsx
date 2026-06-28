import Link from 'next/link';
import type { Metadata } from 'next';
import { CloudAlert } from 'lucide-react';
import { StorefrontHome } from '@/components/home/storefront-home';
import { Button } from '@/components/ui/button';
import { getPublicHomepageData } from '@/lib/api/public-storefront';
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
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
  let homeData;

  try {
    homeData = await getPublicHomepageData();
  } catch {
    homeData = null;
  }

  const siteJsonLd = [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(HOME_PAGE_DESCRIPTION),
  ];

  if (!homeData) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <div className="container mx-auto flex min-h-[60vh] w-full items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-2xl rounded-4xl border border-border/70 bg-card px-8 py-14 text-center shadow-sm">
            <CloudAlert className="mx-auto size-10 text-primary" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-destructive">
              Something went wrong.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              The store is temporarily unavailable. You can still browse product details.
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <StorefrontHome homeData={homeData} />
    </>
  );
}
