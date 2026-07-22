import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACCOUNT_BENEFITS = [
  'Track your orders',
  'View your Ichiban Kuji history',
  'Save your wishlist',
  'Enjoy faster checkout across Canada',
] as const;

function AccountBenefits() {
  return (
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
  );
}

export function StorefrontWelcome() {
  return (
    <section
      aria-labelledby="storefront-welcome-heading"
      className="container mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-12"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-5 border-y border-border/70 py-6 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Welcome to PopBox Studio
          </p>
          <h2
            id="storefront-welcome-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:mt-3 lg:text-4xl"
          >
            PopBox Studio
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 lg:mt-4">
            Discover authentic anime collectibles from Japan. Create a free account to track orders, view your
            Kuji history, save your wishlist, and enjoy faster checkout across Canada.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:mt-7">
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

        <details className="mobile-benefits-disclosure group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold text-foreground marker:content-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
            <span>Benefits</span>
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="overflow-hidden">
            <div className="pt-4">
              <AccountBenefits />
            </div>
          </div>
        </details>

        <div className="hidden lg:block">
          <AccountBenefits />
        </div>
      </div>
    </section>
  );
}
