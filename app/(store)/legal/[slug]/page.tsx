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
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const label = CANONICAL_LABELS[params.slug];

  if (!label) {
    return { title: 'Not Found - PopBox Studio' };
  }

  return {
    title: `${label} - PopBox Studio`,
  };
}

export default function LegalRoute({ params }: Props) {
  const validSlugs = ['faq', 'shipping-returns', 'terms', 'privacy'];

  if (!validSlugs.includes(params.slug)) {
    notFound();
  }

  return <PublicLegalPage slug={params.slug} />;
}
