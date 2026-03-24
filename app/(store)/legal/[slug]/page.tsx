import { notFound } from 'next/navigation';
import { PublicLegalPage } from '@/components/storefront/legal/public-legal-page';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const CANONICAL_LABELS: Record<string, string> = {
    faq: 'FAQ',
    'shipping-returns': 'Shipping & Returns',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
  };

  const label = CANONICAL_LABELS[params.slug];
  
  if (!label) {
    return { title: 'Not Found - PopBox Studio' };
  }
  
  return {
    title: `${label} - PopBox Studio`,
  };
}

export default async function LegalRoute(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const validSlugs = ['faq', 'shipping-returns', 'terms', 'privacy'];
  if (!validSlugs.includes(params.slug)) {
    notFound();
  }

  return <PublicLegalPage slug={params.slug} />;
}
