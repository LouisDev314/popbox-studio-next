import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';

const PAGE_TITLE = 'About the Store';
const PAGE_DESCRIPTION =
  'PopBox Studio is an anime store in Canada for fans shopping anime merch, anime figures, Ichiban Kuji, and fun anime gifts.';

const whatWeSell = [
  {
    title: 'Anime figures',
    description:
      'From prize figures to standout favorites, we keep anime figures front and center.',
  },
  {
    title: 'Plushies and gifts',
    description:
      'Cute plushies, small extras, and anime gifts that are easy to grab for yourself or someone else.',
  },
  {
    title: 'Ichiban Kuji',
    description:
      'Ichiban Kuji is a big part of the shop, with prize items and drops that bring a little hype to every browse.',
  },
];

const reasonsToShop = [
  'The shop stays focused, so you are not digging through a giant wall of random stuff.',
  'Products, types, collections, and search are easy to use whether you know what you want or are just browsing.',
  'It feels like an anime store made by people who actually like anime merch.',
];

const trustPoints = [
  {
    title: 'Easy to browse',
    description:
      'The goal is simple: make it easy to spot the good stuff fast, without the page feeling packed or messy.',
  },
  {
    title: 'Help is clear',
    description:
      'If you need shipping info, order help, or a quick answer, the support and policy pages are easy to find.',
  },
  {
    title: 'Built for fans',
    description:
      'This anime store is for fans, gift shoppers, and anyone chasing a fun find from their favorite series.',
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
      <section className="relative border-b border-border/60">
        <div className="container relative z-10 mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm">
                About PopBox Studio
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                An anime store built for fun finds, good picks, and Ichiban Kuji hype.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                PopBox Studio is an anime store for people who want cool anime merch without
                digging through endless clutter.
              </p>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                You will find anime figures, plushies, anime gifts, and Ichiban Kuji picks in
                one clean place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/products">Shop anime merch</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                  <Link href="/products?type=kuji">Shop Ichiban Kuji</Link>
                </Button>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-border/70 bg-background p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Why people shop here
              </p>
              <ul className="mt-5 space-y-4">
                <li className="border-b border-border/60 pb-4">
                  <p className="text-base font-semibold text-foreground">Good stuff, less noise</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The shop stays focused so browsing feels quick and easy.
                  </p>
                </li>
                <li className="border-b border-border/60 pb-4">
                  <p className="text-base font-semibold text-foreground">Anime first</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Anime figures, merch, and Ichiban Kuji are the heart of the store.
                  </p>
                </li>
                <li>
                  <p className="text-base font-semibold text-foreground">Simple help</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    When you need answers, the support pages are easy to reach.
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
              A small anime store with a clear vibe.
            </h2>
          </div>
          <div className="max-w-2xl space-y-4 text-base leading-7 text-muted-foreground">
            <p>
              PopBox Studio is for anime fans, casual buyers, and anyone looking for a fun gift
              that does not feel random.
            </p>
            <p>
              We keep the mix simple: anime merch, anime figures, plushies, and Ichiban Kuji in
              one place that feels easy to shop.
            </p>
            <p>
              It is the kind of anime store where you can scroll for five minutes and actually
              find something you want.
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
              The stuff people actually come for.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              The lineup stays tight so the page feels fun to browse, not like homework.
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
              Easy to shop from the first click.
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

      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Ichiban Kuji
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ichiban Kuji is not tucked away here.
              </h2>
            </div>
            <div className="max-w-2xl space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ichiban Kuji has its own kind of energy. Part of the fun is the prize format, the
                surprise, and the rush of seeing what is in a set.
              </p>
              <p>
                That is why it has a real place in the shop, right alongside anime figures and the
                rest of our anime merch.
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
            Questions before you order?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            If you want a quick answer before buying, check the{' '}
            <Link href="/faq" className="font-medium text-foreground underline-offset-4 hover:underline">
              FAQ
            </Link>{' '}
            or send us a message through the{' '}
            <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
              contact page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.25rem] border border-border/70 bg-card px-6 py-10 shadow-sm sm:px-8 sm:py-12 lg:px-12">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Keep exploring
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Find your next favorite anime pick.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Browse anime merch, anime figures, anime gifts, and Ichiban Kuji without the usual
                mess.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/products">Browse the anime store</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                  <Link href="/collections/featured">See featured picks</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
