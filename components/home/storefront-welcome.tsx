import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACCOUNT_BENEFITS = [
  'Track your orders',
  'View your Ichiban Kuji history',
  'Save your wishlist',
  'Enjoy faster checkout across Canada',
] as const;

export function StorefrontWelcome() {
  return (
    <section
      aria-labelledby="storefront-welcome-heading"
      className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-8 border-y border-border/70 py-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Welcome to PopBox Studio
          </p>
          <h2
            id="storefront-welcome-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            PopBox Studio
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-foreground sm:text-xl">
            Canada&apos;s destination for authentic Ichiban Kuji, anime figures, plushies, and licensed collectibles.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Shop authentic anime collectibles from Japan and create a free PopBox Studio account to:
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
              <Link href="/account/sign-up">Create Account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-border/80 bg-background px-7 text-base font-semibold"
            >
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>

        <div>
          <ul className="space-y-3" aria-label="PopBox Studio account benefits">
            {ACCOUNT_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-base leading-7 text-foreground">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-border/70 pt-5 text-sm leading-6 text-muted-foreground">
            Google Sign-In is an optional, secure way to create or access your customer account. It is used only
            for account access and these shopping features.
          </p>
        </div>
      </div>
    </section>
  );
}
