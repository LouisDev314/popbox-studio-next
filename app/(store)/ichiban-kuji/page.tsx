import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';

const PAGE_TITLE = 'What\'s Ichiban Kuji?';
const PAGE_DESCRIPTION =
  'Learn what Ichiban Kuji is, how the prize draw format works, what collectors can expect, and how PopBox Studio presents Kuji releases in the storefront.';

const howItWorks = [
  {
    step: '01',
    title: 'Buy a ticket into the release',
    description:
      'Ichiban Kuji is a prize-draw format where each ticket is tied to a reward. The appeal starts before the reveal.',
  },
  {
    step: '02',
    title: 'Reveal the prize tier you drew',
    description:
      'Instead of hoping an order ships later without context, the draw format is built around prize tiers and immediate anticipation.',
  },
  {
    step: '03',
    title: 'Collect a release with built-in excitement',
    description:
      'Fans follow Kuji launches because the format turns each purchase into a collectible moment, not just a standard product transaction.',
  },
];

const expectations = [
  {
    title: 'No losing tickets',
    description:
      'The format is known for every draw resulting in a prize, which is part of what makes it approachable even for first-time buyers.',
  },
  {
    title: 'Prize tiers change the feel',
    description:
      'Higher-tier figure prizes, supporting merch, and release-specific extras create a mix that feels curated rather than uniform.',
  },
  {
    title: 'Collectors buy for the format too',
    description:
      'The reveal, the lineup, and the limited nature of the release all contribute to the appeal alongside the item itself.',
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
      <section className="border-b border-border/60 bg-muted/25">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Ichiban Kuji guide
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.02]">
                A draw where the excitement starts before you even know what you’ve won.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Ichiban Kuji is a Japanese prize draw where every ticket guarantees a collectible. Each release is built around limited prize tiers, shifting odds, and the anticipation of the reveal — turning every draw into part of the experience, not just the outcome.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link href="/products?type=kuji">Explore Ichiban Kuji</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-border/80 bg-background/80 px-7 hover:bg-background"
                >
                  <Link href="/products">Browse all products</Link>
                </Button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-card px-6 py-8 shadow-[0_28px_60px_-46px_hsl(var(--foreground)/0.55)] ring-1 ring-border/70 sm:px-8">
              <div className="absolute inset-x-0 top-0 h-18 bg-accent/45" />
              <div className="relative">
                <Image
                  src="/logo-kuji.png"
                  alt="Ichiban Kuji logo"
                  width={72}
                  height={72}
                  className="h-[4.5rem] w-[4.5rem] object-contain"
                />
                <div className="mt-8 space-y-4">
                  <div className="border-b border-border/70 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      What it means
                    </p>
                    <p className="mt-2 text-base leading-7 text-foreground">
                      A ticket-based collector format where the draw itself is part of the experience.
                    </p>
                  </div>
                  <div className="border-b border-border/70 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      What to expect
                    </p>
                    <p className="mt-2 text-base leading-7 text-foreground">
                      Prize tiers, release-specific lineups, and a stronger sense of occasion than a standard product listing.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Why it stands out
                    </p>
                    <p className="mt-2 text-base leading-7 text-foreground">
                      The reveal, not just the item, becomes part of why people collect it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              How the draw system works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              The format is simple. The appeal comes from the release design around it.
            </h2>
          </div>
          <div className="space-y-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="grid gap-3 border-t border-border/70 pt-6 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-6">
                <p className="text-sm font-semibold tracking-[0.22em] text-primary">{item.step}</p>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-3">
            {expectations.map((item) => (
              <div key={item.title} className="border-t border-border/70 pt-5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              At PopBox Studio
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              We present Kuji releases clearly so you can understand the format before you buy.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-muted-foreground">
            <p>
              When a Kuji release is available in our storefront, the product page should tell you the specific release details, what type of draw it is, and any release notes that matter for that listing.
            </p>
            <p>
              That means you can browse Kuji alongside the rest of the store without losing the context that makes the format special. If a release has important prize or fulfillment details, check the product page first.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
