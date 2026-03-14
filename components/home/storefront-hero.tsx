'use client';

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
    <div className="relative overflow-hidden rounded-3xl bg-primary/10 mb-16 h-[500px] flex items-center shadow-sm">
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/20 blur-3xl rounded-full" />
      </div>
      
      <div className="relative z-10 w-full px-8 md:px-16 flex flex-col items-start gap-6 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight">
          {props.title}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
          {props.subtitle}
        </p>
        <Button asChild size="lg" className="mt-4 rounded-full px-8 py-6 text-lg shadow-md font-semibold">
          <Link href={props.ctaLink}>{props.ctaText}</Link>
        </Button>
      </div>
    </div>
  );
}
