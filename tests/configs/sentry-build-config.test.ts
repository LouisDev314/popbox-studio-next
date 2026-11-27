import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: vi.fn((config: NextConfig) => config),
}));

const sentryBuildVariables = [
  'CI', 'VERCEL', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_SHA', 'WORKERS_CI_COMMIT_SHA',
  'SENTRY_ENABLE_BUILD', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN', 'SENTRY_RELEASE',
] as const;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sentryBuildVariables.forEach((key) => vi.stubEnv(key, ''));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function configureVercelProduction() {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('VERCEL_ENV', 'production');
}

function configureUploadEnvironment() {
  vi.stubEnv('SENTRY_ORG', 'test-org');
  vi.stubEnv('SENTRY_PROJECT', 'test-project');
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'test-only-upload-token');
}

describe('Sentry build integration', () => {
  it('does not require upload credentials for local or uncredentialed CI builds', async () => {
    await import('@/next.config');
    expect(withSentryConfig).not.toHaveBeenCalled();

    vi.resetModules();
    vi.stubEnv('CI', 'true');
    await import('@/next.config');
    expect(withSentryConfig).not.toHaveBeenCalled();
  });

  it('fails a Vercel production build with missing upload configuration', async () => {
    configureVercelProduction();

    await expect(import('@/next.config')).rejects.toThrow(
      'Sentry production build integration requires SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN.',
    );
  });

  it('fails an explicitly enabled build with missing upload configuration', async () => {
    vi.stubEnv('SENTRY_ENABLE_BUILD', 'true');

    await expect(import('@/next.config')).rejects.toThrow('Sentry production build integration requires');
  });

  it('leaves upload disabled in a credential-free Workers Builds preview', async () => {
    vi.stubEnv('CI', 'true');
    vi.stubEnv('WORKERS_CI_COMMIT_SHA', 'preview-commit-sha');
    await import('@/next.config');

    expect(withSentryConfig).not.toHaveBeenCalled();
  });

  it('uploads production maps under the deployment commit instead of a shared release label', async () => {
    configureVercelProduction();
    configureUploadEnvironment();
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'deployment-commit-sha');
    vi.stubEnv('SENTRY_RELEASE', 'shared-label');
    await import('@/next.config');

    expect(withSentryConfig).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      release: { name: 'deployment-commit-sha' },
      sourcemaps: { disable: false },
    }));
  });

  it('uses the Workers Builds deployment commit for an explicitly enabled upload', async () => {
    vi.stubEnv('SENTRY_ENABLE_BUILD', 'true');
    vi.stubEnv('WORKERS_CI_COMMIT_SHA', ' workers-commit-sha ');
    vi.stubEnv('SENTRY_RELEASE', 'shared-label');
    configureUploadEnvironment();
    await import('@/next.config');

    expect(withSentryConfig).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      release: { name: 'workers-commit-sha' },
      sourcemaps: { disable: false },
    }));
  });

  it('requires an attributable release in a credentialed production build', async () => {
    configureVercelProduction();
    configureUploadEnvironment();

    await expect(import('@/next.config')).rejects.toThrow(
      'Sentry production builds require VERCEL_GIT_COMMIT_SHA, WORKERS_CI_COMMIT_SHA, or SENTRY_RELEASE.',
    );
  });

  it('also requires a release in a credentialed explicitly enabled build', async () => {
    vi.stubEnv('SENTRY_ENABLE_BUILD', 'true');
    configureUploadEnvironment();

    await expect(import('@/next.config')).rejects.toThrow('Sentry production builds require');
  });

  it('uses an explicit CI release and supports CI=1', async () => {
    vi.stubEnv('CI', '1');
    vi.stubEnv('SENTRY_RELEASE', 'ci-commit-sha');
    configureUploadEnvironment();
    await import('@/next.config');

    expect(withSentryConfig).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      release: { name: 'ci-commit-sha' },
    }));
  });

  it('preserves the explicit integration opt-out', async () => {
    configureVercelProduction();
    vi.stubEnv('SENTRY_ENABLE_BUILD', 'false');
    await import('@/next.config');

    expect(withSentryConfig).not.toHaveBeenCalled();
  });
});
