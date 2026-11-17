import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import getPublicEnvConfig from '@/configs/public-env';

const isCiBuild = process.env.CI === 'true' || process.env.CI === '1';
const isVercelProductionBuild = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
const sentryBuildExplicitlyEnabled = process.env.SENTRY_ENABLE_BUILD === 'true';
const sentryBuildExplicitlyDisabled = process.env.SENTRY_ENABLE_BUILD === 'false';
const shouldEnableSentryBuild = !sentryBuildExplicitlyDisabled
  && (isCiBuild || isVercelProductionBuild || sentryBuildExplicitlyEnabled);

const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryRelease = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || process.env.SENTRY_RELEASE?.trim();
const hasRequiredSentryBuildEnv = Boolean(sentryOrg && sentryProject && sentryAuthToken);
const shouldApplySentryConfig = shouldEnableSentryBuild && hasRequiredSentryBuildEnv;
const configuredSupabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;
const configuredSupabaseStorageBucket = getPublicEnvConfig().supabaseStorageBucket;

if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(configuredSupabaseStorageBucket)) {
  throw new Error('NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET must be a valid Supabase Storage bucket name.');
}

const supabaseProductImagePathname = (
  `/storage/v1/object/public/${configuredSupabaseStorageBucket}/products/**`
);

const supabaseImageHostnames = Array.from(
  new Set(
    ['bpclnekuanwtojarniyc.supabase.co', configuredSupabaseHostname].filter(
      (hostname): hostname is string => Boolean(hostname),
    ),
  ),
);

if (
  shouldEnableSentryBuild
  && (isVercelProductionBuild || sentryBuildExplicitlyEnabled)
  && !hasRequiredSentryBuildEnv
) {
  throw new Error(
    'Sentry production build integration requires SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN.',
  );
}

if (shouldApplySentryConfig && isVercelProductionBuild && !sentryRelease) {
  throw new Error('Sentry production builds require VERCEL_GIT_COMMIT_SHA or SENTRY_RELEASE.');
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  htmlLimitedBots: /.*/,
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
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
    deviceSizes: [414, 640, 768, 828, 1024, 1280, 1536, 1920],
    formats: ['image/webp'],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 2678400,
    qualities: [75],
    remotePatterns: supabaseImageHostnames.map((hostname) => ({
      protocol: 'https',
      hostname,
      pathname: supabaseProductImagePathname,
    })),
  },
  typescript: {
    tsconfigPath: process.env.NEXT_TYPESCRIPT_CONFIG?.trim() || 'tsconfig.json',
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
    release: sentryRelease
      ? {
        name: sentryRelease,
      }
      : undefined,
  })
  : nextConfig;

export default sentryConfig;
