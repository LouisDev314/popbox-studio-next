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
    <section className="relative mb-14 overflow-hidden rounded-[2.25rem] border border-border/60 bg-[linear-gradient(145deg,hsl(var(--background)),hsl(var(--primary)/0.16))] shadow-sm md:mb-16">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/30 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-[420px] w-full flex-col items-start justify-center gap-5 px-6 py-12 sm:px-8 md:min-h-[500px] md:px-14 md:py-16">
        <p className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground backdrop-blur-sm">
          PopBox Studio storefront
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {props.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg md:text-xl">
          {props.subtitle}
        </p>
        <Button asChild size="lg" className="mt-3 rounded-full px-8 py-6 text-lg font-semibold shadow-md">
          <Link href={props.ctaLink}>{props.ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}
