import type { IPublicLegalDocument } from '@/interfaces/legal';

const CANONICAL_LABELS: Record<string, string> = {
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

const UPDATED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatUpdatedDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return UPDATED_DATE_FORMATTER.format(date);
}

export function PublicLegalPage({ doc }: { doc: IPublicLegalDocument }) {
  const label = CANONICAL_LABELS[doc.type] ?? 'Legal Document';
  const lastUpdated = formatUpdatedDate(doc.updatedAt);

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mb-10 border-b border-border/60 pb-6 sm:mb-12 sm:pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {doc.title || label}
          </h1>
          {lastUpdated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </header>

        <article className="space-y-5 break-words text-base leading-8 text-foreground">
          {doc.content.split(/\n\n+/).map((paragraph, idx) => (
            <p key={idx} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </article>
      </div>
    </div>
  );
}
