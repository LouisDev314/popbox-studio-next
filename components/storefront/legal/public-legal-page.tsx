'use client';

import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IPublicLegalDocument } from '@/interfaces/legal';
import { FileText } from 'lucide-react';

const SLUG_TO_TYPE: Record<string, string> = {
  'faq': 'faq',
  'shipping-returns': 'shipping_returns',
  'terms': 'terms',
  'privacy': 'privacy',
};

const CANONICAL_LABELS: Record<string, string> = {
  faq: 'FAQ',
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

export function PublicLegalPage({ slug }: { slug: string }) {
  const type = SLUG_TO_TYPE[slug];

  const { data, isPending, isError } = useCustomizeQuery<IPublicLegalDocument>({
    queryKey: ['public', 'legal', type],
    queryFn: () => QueryConfigs.fetchPublicLegalDoc(type),
    enabled: !!type,
    retry: false, // Do not retry if we receive a 404 (document not found/published)
  });

  if (!type) {
    return <NotFoundState />;
  }

  if (isPending) {
    return <LoadingState />;
  }

  const doc = data?.data?.data;

  // Render polite missing state if backend 404s
  if (isError || !doc) {
    return <NotFoundState label={CANONICAL_LABELS[type]} />;
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 max-w-3xl">
        <div className="mb-12 border-b border-border pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {doc.title || CANONICAL_LABELS[type]}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: {new Date(doc.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="text-base text-foreground leading-relaxed">
          {doc.content.split(/\n\n+/).map((paragraph, idx) => (
            <p key={idx} className="mb-6 whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-32 sm:px-6 lg:px-8 max-w-3xl flex justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function NotFoundState({ label }: { label?: string }) {
  return (
    <div className="container mx-auto px-4 py-32 sm:px-6 lg:px-8 max-w-xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {label || 'Document'} Not Found
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        This document has not been published yet or is currently unavailable. Please check back later.
      </p>
    </div>
  );
}
