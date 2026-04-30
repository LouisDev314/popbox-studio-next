import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';

export function StorefrontBottomCta() {
  return (
    <section className="mx-auto w-full pt-2 text-center">
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

      <div className="relative overflow-hidden border border-border/60 bg-card text-left">
        <div className="relative min-h-48 sm:min-h-58 lg:min-h-68">
          <StorefrontImage
            src="/kuji-bottom-cta.webp"
            alt="Ichiban Kuji lucky draw banner"
            className="absolute inset-0 h-full w-full"
            imageClassName="object-cover object-center sm:object-[center_40%]"
            sizes="(min-width: 1024px) 1200px, 100vw"
          />
          <div className="absolute inset-0 bg-black/22" />
          <div className="relative flex min-h-48 items-end px-6 py-6 sm:min-h-58 sm:px-8 sm:py-8 lg:min-h-68 lg:px-10 lg:py-10">
            <p className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.28)] sm:text-3xl lg:text-4xl">
              Every draw guarantees a prize.<br />Try your first draw today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
