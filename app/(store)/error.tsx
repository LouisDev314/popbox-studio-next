'use client';

import * as Sentry from '@sentry/nextjs';
import { CloudAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function StoreError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] w-full items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-2xl rounded-4xl border border-border/70 bg-card px-8 py-14 text-center shadow-sm">
        <CloudAlert aria-hidden="true" className="mx-auto size-10 text-primary" />
        <h1 className="mt-5 text-2xl font-bold text-foreground">This page is temporarily unavailable</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Please try again, or continue browsing products.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} className="rounded-full px-6">Try again</Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
