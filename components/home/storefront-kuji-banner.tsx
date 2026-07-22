import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';

export function StorefrontKujiBanner() {
  return (
    <section className="container mx-auto px-4 mb-16 xl:mb-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/ichiban-kuji"
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          <div className="relative aspect-[20/7] overflow-hidden rounded-[1.25rem] border border-border/60 bg-card">
            <StorefrontImage
              src="/what-is-ichiban-kuji.webp"
              alt="What is Ichiban Kuji banner"
              className="h-full w-full"
              imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.01]"
              sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), 768px"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}
