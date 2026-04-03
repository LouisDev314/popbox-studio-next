import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface IStorefrontHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export function StorefrontHero(props: IStorefrontHeroProps) {
  return (
    <section className="relative mb-10 overflow-hidden border-y border-border/60 bg-card md:mb-12 md:rounded-[2rem] md:border">
      <div className="relative z-10 flex min-h-[420px] w-full flex-col items-start justify-center gap-5 px-6 py-12 sm:px-8 md:min-h-[500px] md:px-14 md:py-16">
        <p className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          PopBox Studio storefront
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {props.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg md:text-xl">
          {props.subtitle}
        </p>
        <Button asChild size="lg" className="mt-3 rounded-full px-8 py-6 text-lg font-semibold">
          <Link href={props.ctaLink}>{props.ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}
