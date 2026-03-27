import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { IPublicFaqItem } from '@/interfaces/legal';

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

export function PublicFaqPage({ items }: { items: IPublicFaqItem[] }) {
  const safeItems = Array.isArray(items) ? items : [];
  const lastUpdated = formatUpdatedDate(safeItems);

  return (
    <div className="bg-background">
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
          <Accordion
            className="w-full"
            defaultValue={safeItems[0] ? [safeItems[0].id] : undefined}
          >
            {safeItems.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="py-2">
                <AccordionTrigger className="text-base font-semibold text-foreground">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-foreground">
                  {item.answer.split(/\n\n+/).map((paragraph, index) => (
                    <p key={`${item.id}-${index}`} className="whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
