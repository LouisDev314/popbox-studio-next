import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';

export function StorefrontKujiBanner() {
  return (
    <section className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/ichiban-kuji"
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          <div className="relative aspect-[20/7] overflow-hidden rounded-[1.25rem] border border-border/60 bg-card">
            <StorefrontImage
              src="/what-is-ichiban-kuji.webp"
              alt="What is Ichiban Kuji banner"
              priority
              className="h-full w-full"
              imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.01]"
              sizes="(min-width: 1024px) 896px, (min-width: 640px) 92vw, 100vw"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}
