import type { Metadata } from 'next';
import { StorefrontHome } from '@/components/home/storefront-home';
import { getPublicHomepageData } from '@/lib/api/public-storefront';
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  createPageMetadata,
  truncateMetaDescription,
} from '@/lib/seo';

export const revalidate = 300;

const HOME_PAGE_DESCRIPTION = truncateMetaDescription(
  'Shop PopBox Studio for anime merchandise, collectibles, figures, plushies, cards, gifts, and Ichiban Kuji online from an anime store in Canada.',
  165,
);

export const metadata: Metadata = createPageMetadata({
  absoluteTitle: 'PopBox Studio | Anime Merchandise, Collectibles & Ichiban Kuji',
  description: HOME_PAGE_DESCRIPTION,
  path: '/',
});

export default async function StoreRootPage() {
  // Let failed regeneration reject so ISR retains the last successful homepage.
  // Cold failures are handled by the store error boundary, not cached as success.
  const homeData = await getPublicHomepageData();

  const siteJsonLd = [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(HOME_PAGE_DESCRIPTION),
  ];

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
