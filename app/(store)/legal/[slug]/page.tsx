import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PublicFaqPage } from '@/components/storefront/legal/public-faq-page';
import { PublicLegalPage } from '@/components/storefront/legal/public-legal-page';
import { getPublicFaqItems, getPublicLegalDocument, isPublicApiNotFoundError } from '@/lib/api/public-storefront';
import type { LegalDocumentType } from '@/interfaces/legal';

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
    return {
      title: 'FAQ - PopBox Studio',
    };
  }

  const type = SLUG_TO_TYPE[params.slug];

  if (!type) {
    return { title: 'Not Found - PopBox Studio' };
  }

  try {
    const document = await getPublicLegalDocument(type);

    return {
      title: `${document.title || CANONICAL_LABELS[type]} - PopBox Studio`,
    };
  } catch {
    return {
      title: `${CANONICAL_LABELS[type]} - PopBox Studio`,
    };
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
    let faqItems = null;

    try {
      faqItems = await getPublicFaqItems();
    } catch (error) {
      if (isPublicApiNotFoundError(error)) {
        notFound();
      }

      faqItems = null;
    }

    if (!faqItems) {
      return (
        <LegalUnavailableState label="FAQ" />
      );
    }

    if (faqItems.length === 0) {
      return (
        <LegalUnavailableState label="FAQ" />
      );
    }

    return <PublicFaqPage items={faqItems} />;
  }

  const type = SLUG_TO_TYPE[params.slug];

  if (!type) {
    notFound();
  }

  let document = null;

  try {
    document = await getPublicLegalDocument(type);
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

  return <PublicLegalPage doc={document} />;
}
