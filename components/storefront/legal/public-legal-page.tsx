import type { IPublicLegalDocument } from '@/interfaces/legal';

const CANONICAL_LABELS: Record<string, string> = {
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

export function PublicLegalPage({ doc }: { doc: IPublicLegalDocument }) {
  const label = CANONICAL_LABELS[doc.type] ?? 'Legal Document';

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 max-w-3xl">
        <div className="mb-12 border-b border-border pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {doc.title || label}
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
