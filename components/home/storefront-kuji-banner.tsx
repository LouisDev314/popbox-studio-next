import Image from 'next/image';
import Link from 'next/link';

export function StorefrontKujiBanner() {
  return (
    <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/ichiban-kuji"
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card">
            <div className="relative aspect-[2.85/1] w-full min-h-28 sm:min-h-36 md:min-h-40 lg:min-h-44 xl:min-h-40">
              <Image
                src="/what-is-ichiban-kuji.webp"
                alt="What is Ichiban Kuji banner"
                fill
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.01] sm:object-[center_42%]"
                sizes="(min-width: 1280px) 1152px, (min-width: 768px) 90vw, 100vw"
              />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
