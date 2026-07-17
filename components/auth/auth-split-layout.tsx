import Image from 'next/image';
import type { ReactNode } from 'react';

export function AuthSplitLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[54%_46%]">
      <div className="relative hidden min-h-[42rem] overflow-hidden bg-muted lg:block">
        <Image
          src="/store-bg.webp"
          alt=""
          fill
          priority
          sizes="54vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-foreground/10" aria-hidden="true" />
      </div>
      <div className="flex items-start px-4 py-12 sm:px-6 sm:py-16 lg:items-center lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground text-center sm:text-4xl">{title}</h1>
          {children}
        </div>
      </div>
    </section>
  );
}
