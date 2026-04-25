import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PublicLegalPage } from '@/components/storefront/legal/public-legal-page';
import { getPublicLegalDocument, getPublicShippingSettings, isPublicApiNotFoundError } from '@/lib/api/public-storefront';
import type { LegalDocumentType } from '@/interfaces/legal';
import type { IShippingSettings } from '@/interfaces/shipping';
import {
  buildExcerpt,
  createPageMetadata,
} from '@/lib/seo';

const SLUG_TO_TYPE: Record<string, LegalDocumentType> = {
  'shipping-returns': 'shipping_returns',
  terms: 'terms',
  privacy: 'privacy',
};

const CANONICAL_LABELS: Record<LegalDocumentType, string> = {
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;

  if (params.slug === 'faq') {
    return createPageMetadata({
      title: 'FAQ',
      description: 'Find answers to common questions about PopBox Studio orders, shipping, returns, and Ichiban Kuji support.',
      path: '/faq',
    });
  }

  const type = SLUG_TO_TYPE[params.slug];

  if (!type) {
    return createPageMetadata({
      title: 'Not found',
      description: 'The requested legal page could not be found.',
      path: `/legal/${params.slug}`,
      noIndex: true,
    });
  }

  try {
    const document = await getPublicLegalDocument(type);

    return createPageMetadata({
      title: document.title || CANONICAL_LABELS[type],
      description: buildExcerpt(
        document.content,
        `${CANONICAL_LABELS[type]} for shopping at PopBox Studio.`,
      ),
      path: `/legal/${params.slug}`,
    });
  } catch {
    return createPageMetadata({
      title: CANONICAL_LABELS[type],
      description: `${CANONICAL_LABELS[type]} for shopping at PopBox Studio.`,
      path: `/legal/${params.slug}`,
      noIndex: true,
    });
  }
}

function LegalUnavailableState({ label }: { label: string }) {
  return (
    <div className="container mx-auto px-4 py-32 sm:px-6 lg:px-8 max-w-xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {label} Unavailable
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        This document is temporarily unavailable. Please check back later.
      </p>
    </div>
  );
}

export default async function LegalRoute(props: Props) {
  const params = await props.params;

  if (params.slug === 'faq') {
    redirect('/faq');
  }

  const type = SLUG_TO_TYPE[params.slug];

  if (!type) {
    notFound();
  }

  const shippingSettingsPromise: Promise<IShippingSettings | null> = type === 'shipping_returns'
    ? getPublicShippingSettings().catch(() => null)
    : Promise.resolve(null);

  let document = null;
  let shippingSettings: IShippingSettings | null = null;

  try {
    document = await getPublicLegalDocument(type);
    shippingSettings = await shippingSettingsPromise;
  } catch (error) {
    if (isPublicApiNotFoundError(error)) {
      notFound();
    }

    document = null;
  }

  if (!document) {
    return (
      <LegalUnavailableState label={CANONICAL_LABELS[type]} />
    );
  }

  return <PublicLegalPage doc={document} shippingSettings={shippingSettings} />;
}
