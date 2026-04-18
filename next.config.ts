import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import getPublicEnvConfig from '@/configs/public-env';

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/orders/:publicId',
          has: [
            {
              type: 'query',
              key: 'token',
              value: '(?<token>.*)',
            },
          ],
          missing: [
            {
              type: 'query',
              key: 'handoff',
            },
          ],
          destination: '/orders/:publicId/access?next=order&token=:token',
        },
        {
          source: '/orders/:publicId/tickets',
          has: [
            {
              type: 'query',
              key: 'token',
              value: '(?<token>.*)',
            },
          ],
          missing: [
            {
              type: 'query',
              key: 'handoff',
            },
          ],
          destination: '/orders/:publicId/access?next=tickets&token=:token',
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${getPublicEnvConfig().apiBaseUrl}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bpclnekuanwtojarniyc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG!,
  project: process.env.SENTRY_PROJECT!,
  authToken: hasSentryAuthToken ? process.env.SENTRY_AUTH_TOKEN : undefined,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !hasSentryAuthToken,
  },
  release: process.env.SENTRY_RELEASE ? { name: process.env.SENTRY_RELEASE } : undefined,
});
