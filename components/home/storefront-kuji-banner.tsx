import Image from 'next/image';
import Link from 'next/link';

export function StorefrontKujiBanner() {
  return (
    <section className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/ichiban-kuji"
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          <div className="overflow-hidden rounded-[1.25rem] border border-border/60 bg-card">
            <Image
              src="/what-is-ichiban-kuji.webp"
              alt="What is Ichiban Kuji banner"
              width={1600}
              height={560}
              priority={false}
              className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.01]"
              sizes="(min-width: 1024px) 896px, (min-width: 640px) 92vw, 100vw"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}
