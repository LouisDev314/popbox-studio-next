'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';
import { ReactQueryProvider } from '@/components/react-query-provider';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          {/* `NextError` is the default Next.js error page component. Its type
          definition requires a `statusCode` prop. However, since the App Router
          does not expose status codes for errors, we simply pass 0 to render a
          generic error message. */}
          <NextError statusCode={0} />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
