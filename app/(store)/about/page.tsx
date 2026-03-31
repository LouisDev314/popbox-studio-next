import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';

const PAGE_TITLE = 'About the Store';
const PAGE_DESCRIPTION =
  'Learn about PopBox Studio, a premium anime store focused on curated anime collectibles, anime figures, gifts, and Ichiban Kuji for collectors shopping in Canada.';

const whatWeSell = [
  {
    title: 'Figures and display pieces',
    description:
      'From everyday shelf upgrades to standout collector picks, we focus on anime figures and collectibles worth making space for.',
  },
  {
    title: 'Plushies, cards, and giftable finds',
    description:
      'We also carry soft goods, card-related items, and anime gifts that feel thoughtful instead of filler.',
  },
  {
    title: 'Ichiban Kuji-style products',
    description:
      'Ichiban Kuji is part of the store’s identity, with releases and prize-driven collectibles that bring more discovery into the shopping experience.',
  },
];

const reasonsToShop = [
  'A curated mix of anime merchandise, collectibles, and figures instead of an overwhelming catalog.',
  'Clean browsing across products, types, collections, and search so first-time shoppers can find what matters quickly.',
  'A collector-minded storefront that treats presentation, product focus, and product discovery as part of the value.',
];

const trustPoints = [
  {
    title: 'Thoughtful curation',
    description:
      'PopBox Studio is built around selection, not volume. The goal is to offer products that feel worth browsing, saving, gifting, and displaying.',
  },
  {
    title: 'Clear support paths',
    description:
      'Questions should not feel like guesswork. The storefront keeps support and policy routes easy to reach when you need order help, shipping details, or general answers.',
  },
  {
    title: 'Collector-first positioning',
    description:
      'We speak to fans and collectors directly, with product categories and buying flows that reflect how anime collectibles are actually shopped.',
  },
];

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm">
                About PopBox Studio
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                A curated anime collectibles store for fans who care about the details.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                PopBox Studio is a modern anime merchandise store built around thoughtful
                curation, premium presentation, and a collector-friendly shopping experience.
                From anime figures and plushies to cards, display-worthy finds, and Ichiban
                Kuji releases, the store is designed to make discovery feel focused instead of
                noisy.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/products">Shop the collection</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                  <Link href="/products?type=kuji">Browse Ichiban Kuji</Link>
                </Button>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                What guides the store
              </p>
              <ul className="mt-5 space-y-4">
                <li className="border-b border-border/60 pb-4">
                  <p className="text-base font-semibold text-foreground">Curated over crowded</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Product selection should feel intentional, not endless.
                  </p>
                </li>
                <li className="border-b border-border/60 pb-4">
                  <p className="text-base font-semibold text-foreground">Collector-minded focus</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Figures, collectibles, and Ichiban Kuji deserve a storefront that understands
                    how fans browse.
                  </p>
                </li>
                <li>
                  <p className="text-base font-semibold text-foreground">Clean, trusted browsing</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Clear navigation, simple support paths, and polished presentation are part of
                    the product experience.
                  </p>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Who we are
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for anime fans who want a collectible shop with taste and clarity.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-muted-foreground">
            <p>
              PopBox Studio is positioned as a premium anime collectibles online store with a
              simple goal: make it easier to shop anime merchandise that feels worth your time,
              your shelf space, and your attention.
            </p>
            <p>
              The brand is not about chasing every possible product. It is about curating a store
              where anime figures, collectibles, plushies, cards, gifts, and Ichiban Kuji-style
              releases can live together in a way that feels cohesive and easy to browse.
            </p>
            <p>
              That focus keeps the storefront practical for first-time customers and satisfying for
              returning collectors who want a cleaner way to discover their next favorite piece.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              What we sell
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A focused mix of anime merchandise, gifts, and collector-driven product types.
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              The catalog is shaped around products fans actually want to browse online: display
              pieces, giftable finds, and collectible formats that feel distinct from ordinary
              retail inventory.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {whatWeSell.map((item) => (
              <section
                key={item.title}
                className="rounded-[1.75rem] border border-border/70 bg-background/85 p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Why shop with us
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A storefront designed to feel easier to trust on the first visit.
            </h2>
          </div>
          <div className="space-y-5">
            {reasonsToShop.map((reason) => (
              <div
                key={reason}
                className="rounded-[1.5rem] border border-border/70 bg-background px-5 py-5 shadow-sm"
              >
                <p className="text-base leading-7 text-foreground">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--primary)/0.08))]">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Our Ichiban Kuji focus
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ichiban Kuji is not an afterthought here. It is part of what makes PopBox Studio
                distinct.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted-foreground">
              <p>
                Ichiban Kuji brings a different kind of excitement to anime collectibles. The
                appeal is not just the product itself. It is the format, the anticipation, and the
                collectible character of the release.
              </p>
              <p>
                PopBox Studio treats that category as a core part of the brand rather than a small
                side shelf. That means giving shoppers a clear route to browse Kuji-related
                products while keeping them connected to the rest of the store’s figures and anime
                collectibles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {trustPoints.map((item) => (
            <section
              key={item.title}
              className="rounded-[1.75rem] border border-border/70 bg-background p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-border/70 bg-muted/20 p-7 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Need help before you order?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            If you want more detail before buying, the fastest next steps are to review the{' '}
            <Link href="/legal/faq" className="font-medium text-foreground underline-offset-4 hover:underline">
              FAQ
            </Link>{' '}
            or reach out through the{' '}
            <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
              contact page
            </Link>
            . For shipping and return information, you can also review{' '}
            <Link
              href="/legal/shipping-returns"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              shipping &amp; returns
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.25rem] border border-border/70 bg-[linear-gradient(145deg,hsl(var(--background)),hsl(var(--primary)/0.14))] px-6 py-10 shadow-sm sm:px-8 sm:py-12 lg:px-12">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Keep exploring
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Browse PopBox Studio and find your next anime collectible.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Whether you are shopping for anime gifts, shelf-ready figures, or Ichiban Kuji
                releases, the storefront is built to help you browse with confidence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/products">Browse all products</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                  <Link href="/collections/featured">View featured picks</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
