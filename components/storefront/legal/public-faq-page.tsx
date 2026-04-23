import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { IPublicFaqItem } from '@/interfaces/legal';

const FALLBACK_CATEGORY = 'General';

const UPDATED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

type FaqSection = {
  category: string;
  items: IPublicFaqItem[];
};

function formatUpdatedDate(items: IPublicFaqItem[]): string | null {
  if (!items.length) {
    return null;
  }

  let latestDate: Date | null = null;

  for (const item of items) {
    const date = new Date(item.updatedAt);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    if (!latestDate || date > latestDate) {
      latestDate = date;
    }
  }

  if (!latestDate) {
    return null;
  }

  return UPDATED_DATE_FORMATTER.format(latestDate);
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
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mb-10 border-b border-border/60 pb-6 sm:mb-12 sm:pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            FAQ
          </h1>
          {lastUpdated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </header>

        {safeItems.length === 0 ? (
          <div className="text-center text-base text-muted-foreground">
            No frequently asked questions are available right now.
          </div>
        ) : (
          <div className="space-y-9 sm:space-y-11">
            {sections.map((section, index) => (
              <section key={section.category} className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0">
                <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {section.category}
                </h2>

                <Accordion
                  multiple
                  className="w-full overflow-visible rounded-none border-0 bg-transparent"
                  defaultValue={index === 0 && defaultOpenItemId ? [defaultOpenItemId] : undefined}
                >
                  {section.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border-border/60">
                      <AccordionTrigger className="gap-4 px-0 py-4 text-base font-semibold leading-7 text-foreground sm:py-5">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 px-0 pb-5 pr-8 text-[0.95rem] leading-7 text-muted-foreground sm:pr-10">
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
