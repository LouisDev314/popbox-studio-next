import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PublicFaqPage } from '@/components/storefront/legal/public-faq-page';
import { getPublicFaqItems, isPublicApiNotFoundError } from '@/lib/api/public-storefront';
import { createPageMetadata } from '@/lib/seo';

const FAQ_DESCRIPTION =
  'Find answers to common questions about PopBox Studio orders, shipping, returns, and Ichiban Kuji support.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const faqItems = await getPublicFaqItems();

    return createPageMetadata({
      title: 'FAQ',
      description: FAQ_DESCRIPTION,
      path: '/faq',
      noIndex: faqItems.length === 0,
    });
  } catch {
    return createPageMetadata({
      title: 'FAQ',
      description: FAQ_DESCRIPTION,
      path: '/faq',
      noIndex: true,
    });
  }
}

function FaqUnavailableState() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-32 text-center sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        FAQ Unavailable
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        This document is temporarily unavailable. Please check back later.
      </p>
    </div>
  );
}

export default async function FaqRoute() {
  let faqItems = null;

  try {
    faqItems = await getPublicFaqItems();
  } catch (error) {
    if (isPublicApiNotFoundError(error)) {
      notFound();
    }

    faqItems = null;
  }

  if (!faqItems || faqItems.length === 0) {
    return <FaqUnavailableState />;
  }

  return <PublicFaqPage items={faqItems} />;
}
