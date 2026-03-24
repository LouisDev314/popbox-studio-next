import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLegalPage } from '@/components/storefront/legal/public-legal-page';

const CANONICAL_LABELS: Record<string, string> = {
  faq: 'FAQ',
  'shipping-returns': 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const label = CANONICAL_LABELS[params.slug];

  if (!label) {
    return { title: 'Not Found - PopBox Studio' };
  }

  return {
    title: `${label} - PopBox Studio`,
  };
}

export default async function LegalRoute(props: Props) {
  const params = await props.params;
  const validSlugs = ['faq', 'shipping-returns', 'terms', 'privacy'];

  if (!validSlugs.includes(params.slug)) {
    notFound();
  }

  return <PublicLegalPage slug={params.slug} />;
}
