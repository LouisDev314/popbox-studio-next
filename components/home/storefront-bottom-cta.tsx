import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function StorefrontBottomCta() {
  return (
    <section className="mx-auto w-full pb-12 pt-2 text-center md:pb-16 lg:pb-20">
      <div className="border border-border/70 bg-card px-6 py-18 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Looking for something specific?
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            From everyday anime favorites to rare finds, we help you track down pieces from Japan and beyond.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 sm:flex-row">
          <Button className="h-12 w-36 rounded-2xl px-8 text-base font-semibold sm:w-auto sm:min-w-44">
            <Link href="/contact">Contact Us</Link>
          </Button>
          <Button
            variant="outline"
            className="h-12 w-40 rounded-2xl border-border/80 bg-background text-base font-semibold text-foreground hover:bg-muted/45 sm:w-auto sm:min-w-44"
          >
            <Link href="/products">Browse All</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
