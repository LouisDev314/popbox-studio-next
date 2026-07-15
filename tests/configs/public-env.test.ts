import { describe, expect, it } from 'vitest';
import {
  resolveGaMeasurementId,
  resolveSiteUrl,
  resolveSupabasePublicConfig,
  shouldEnableGoogleAnalytics,
} from '@/configs/public-env';

function createEnv(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    ...overrides,
  };
}

describe('resolveSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL when available', () => {
    expect(resolveSiteUrl(createEnv({
      NEXT_PUBLIC_SITE_URL: 'https://www.popboxstudio.com/',
      VERCEL_PROJECT_PRODUCTION_URL: 'prod.example.vercel.app',
      VERCEL_URL: 'preview.example.vercel.app',
    }))).toBe('https://www.popboxstudio.com');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL before preview deployment urls', () => {
    expect(resolveSiteUrl(createEnv({
      VERCEL_PROJECT_PRODUCTION_URL: 'popboxstudio.vercel.app',
      VERCEL_URL: 'preview-popbox.vercel.app',
    }))).toBe('https://popboxstudio.vercel.app');
  });

  it('uses VERCEL_URL when no explicit site url is configured', () => {
    expect(resolveSiteUrl(createEnv({
      VERCEL_URL: 'preview-popbox.vercel.app',
    }))).toBe('https://preview-popbox.vercel.app');
  });

  it('falls back to localhost for local development and local builds', () => {
    expect(resolveSiteUrl(createEnv({}))).toBe('http://localhost:3001');
  });
});

describe('Supabase public environment', () => {
  it('returns the configured URL and publishable key', () => {
    expect(resolveSupabasePublicConfig(createEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co/',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }))).toEqual({
      publishableKey: 'sb_publishable_test',
      url: 'https://project.supabase.co',
    });
  });

  it('fails clearly when either required variable is missing', () => {
    expect(() => resolveSupabasePublicConfig(createEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }))).toThrow('NEXT_PUBLIC_SUPABASE_URL is required');
    expect(() => resolveSupabasePublicConfig(createEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    }))).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  });

  it('does not accept the legacy public-key variable', () => {
    expect(() => resolveSupabasePublicConfig(createEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLIC_KEY: 'legacy-key',
    }))).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  });
});

describe('Google Analytics public environment', () => {
  it('accepts valid GA4 measurement ids and disables malformed ids', () => {
    expect(resolveGaMeasurementId(createEnv({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-N3TZG44VCT' })))
      .toBe('G-N3TZG44VCT');
    expect(resolveGaMeasurementId(createEnv({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'UA-private' })))
      .toBe('');
  });

  it('does not load GA in local or test environments unless deliberate debug mode is enabled', () => {
    expect(shouldEnableGoogleAnalytics(createEnv({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-N3TZG44VCT',
    }))).toBe(false);
    expect(shouldEnableGoogleAnalytics(createEnv({
      NEXT_PUBLIC_GA_DEBUG: 'true',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-N3TZG44VCT',
    }))).toBe(true);
    expect(shouldEnableGoogleAnalytics({
      NODE_ENV: 'production',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-N3TZG44VCT',
    })).toBe(true);
  });
});
