import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { IPublicFaqItem } from '@/interfaces/legal';

const FALLBACK_CATEGORY = 'General';

type FaqSection = {
  category: string;
  items: IPublicFaqItem[];
};

function formatUpdatedDate(items: IPublicFaqItem[]): string | null {
  if (!items.length) {
    return null;
  }

  const latestUpdatedAt = items.reduce((latest, item) => {
    return new Date(item.updatedAt) > new Date(latest.updatedAt) ? item : latest;
  }).updatedAt;

  const date = new Date(latestUpdatedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function groupFaqItems(items: IPublicFaqItem[]): FaqSection[] {
  const sections = new Map<string, IPublicFaqItem[]>();

  for (const item of items) {
    const category = item.category.trim() || FALLBACK_CATEGORY;
    const existingItems = sections.get(category);

    if (existingItems) {
      existingItems.push(item);
      continue;
    }

    sections.set(category, [item]);
  }

  return Array.from(sections, ([category, sectionItems]) => ({
    category,
    items: sectionItems,
  }));
}

export function PublicFaqPage({ items }: { items: IPublicFaqItem[] }) {
  const safeItems = Array.isArray(items) ? items : [];
  const lastUpdated = formatUpdatedDate(safeItems);
  const sections = groupFaqItems(safeItems);
  const defaultOpenItemId = sections[0]?.items[0]?.id;
  const faqJsonLd = safeItems.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: safeItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <div className="bg-background">
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 border-b border-border pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            FAQ
          </h1>
          {lastUpdated ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </div>

        {safeItems.length === 0 ? (
          <div className="text-center text-base text-muted-foreground">
            No frequently asked questions are available right now.
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {sections.map((section, index) => (
              <section key={section.category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {section.category}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Accordion
                  className="w-full rounded-2xl border border-border/60 bg-background px-5 sm:px-6"
                  defaultValue={index === 0 && defaultOpenItemId ? [defaultOpenItemId] : undefined}
                >
                  {section.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border-border/60">
                      <AccordionTrigger className="gap-4 py-5 text-base font-semibold leading-7 text-foreground">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 pr-8 text-[0.95rem] leading-7 text-muted-foreground sm:pr-10">
                        {item.answer.split(/\n\n+/).map((paragraph, paragraphIndex) => (
                          <p key={`${item.id}-${paragraphIndex}`} className="whitespace-pre-wrap">
                            {paragraph}
                          </p>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
