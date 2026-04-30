import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { createPageMetadata } from '@/lib/seo';

const PAGE_TITLE = 'What\'s Ichiban Kuji?';
const PAGE_DESCRIPTION =
  'Introducing how Ichiban Kuji works, why people like it, and what to check when shopping Kuji releases at PopBox Studio.';

const howItWorks = [
  {
    step: '01',
    title: 'Pick a set that you like',
    description:
      'Each Kuji set has its own attractive prize list. You can check them out first and pick the ones you like.',
  },
  {
    step: '02',
    title: 'Buy tickets',
    description:
      'Ichiban Kuji is a ticket-based prize draw from Japan. One ticket gives you one draw, and every draw wins a random prize from the list/pool.',
  },
  {
    step: '03',
    title: 'See what you got',
    description:
      'Prizes are split into tiers, from bigger items like figures to smaller merch. You will know what you got by revealing them.',
  },
];

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/ichiban-kuji',
});

export default function IchibanKujiPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border/60">
        <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Ichiban Kuji guide
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl lg:text-[3.25rem] lg:leading-[1.02]">
                What is Ichiban Kuji (一番くじ)?
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                It is a ticket-based prize draw from Japan. Every draw wins a prize, and each
                release comes with its own lineup of items.
              </p>

              <div className="mt-6 grid gap-3 border-t border-border/70 pt-4 text-sm leading-6 text-muted-foreground">
                <p>Every ticket wins something.</p>
                <p>Each release has its own prize tiers.</p>
                <p>You buy by draw, not by choosing the prize.</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link href="/products?type=kuji">Browse Kuji releases</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/products">Browse all products</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-[20/7] overflow-hidden rounded-[1.75rem] border border-border/60 bg-muted/20">
                <StorefrontImage
                  src="/what-is-ichiban-kuji.webp"
                  alt="Ichiban Kuji product lineup"
                  priority
                  className="h-full w-full"
                  imageClassName="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                <div className="border border-border/60 px-3 py-3">Draw</div>
                <div className="border border-border/60 px-3 py-3">Open</div>
                <div className="border border-border/60 px-3 py-3">Get prize</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto py-12 bg-muted/20">
        <div className="flex px-8 justify-center gap-8">
          <div className="space-y-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              How it works
            </p>
            {howItWorks.map((item) => (
              <div
                key={item.step}
                className="grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-5"
              >
                <p className="text-xs font-semibold tracking-[0.22em] text-primary">{item.step}</p>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
