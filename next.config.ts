import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import getPublicEnvConfig from '@/configs/public-env';

const isCiBuild = process.env.CI === 'true';
const sentryBuildExplicitlyEnabled = process.env.SENTRY_ENABLE_BUILD === 'true';
const sentryBuildExplicitlyDisabled = process.env.SENTRY_ENABLE_BUILD === 'false';
const shouldEnableSentryBuild = !sentryBuildExplicitlyDisabled && (isCiBuild || sentryBuildExplicitlyEnabled);

const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const hasRequiredSentryBuildEnv = Boolean(sentryOrg && sentryProject && sentryAuthToken);
const shouldApplySentryConfig = shouldEnableSentryBuild && hasRequiredSentryBuildEnv;
const configuredSupabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const supabaseImageHostnames = Array.from(
  new Set(
    ['bpclnekuanwtojarniyc.supabase.co', configuredSupabaseHostname].filter(
      (hostname): hostname is string => Boolean(hostname),
    ),
  ),
);

if (shouldEnableSentryBuild && !hasRequiredSentryBuildEnv) {
  console.warn(
    '[next.config] Skipping Sentry build integration because SENTRY_ORG, SENTRY_PROJECT, or SENTRY_AUTH_TOKEN is missing.',
  );
}

const nextConfig: NextConfig = {
  htmlLimitedBots: /.*/,
  allowedDevOrigins: ['127.0.0.1'],
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
    minimumCacheTTL: 2678400,
    remotePatterns: supabaseImageHostnames.map((hostname) => ({
      protocol: 'https',
      hostname,
      pathname: '/storage/v1/object/public/**',
    })),
  },
};

const sentryConfig = shouldApplySentryConfig
  ? withSentryConfig(nextConfig, {
    org: sentryOrg,
    project: sentryProject,
    authToken: sentryAuthToken,
    silent: !isCiBuild,
    sourcemaps: {
      disable: false,
    },
    release: process.env.SENTRY_RELEASE?.trim()
      ? {
        name: process.env.SENTRY_RELEASE.trim(),
      }
      : undefined,
  })
  : nextConfig;

export default sentryConfig;
