import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '@/configs/public-env';

describe('resolveSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL when available', () => {
    expect(resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: 'https://www.popboxstudio.com/',
      VERCEL_PROJECT_PRODUCTION_URL: 'prod.example.vercel.app',
      VERCEL_URL: 'preview.example.vercel.app',
    })).toBe('https://www.popboxstudio.com');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL before preview deployment urls', () => {
    expect(resolveSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: 'popboxstudio.vercel.app',
      VERCEL_URL: 'preview-popbox.vercel.app',
    })).toBe('https://popboxstudio.vercel.app');
  });

  it('uses VERCEL_URL when no explicit site url is configured', () => {
    expect(resolveSiteUrl({
      VERCEL_URL: 'preview-popbox.vercel.app',
    })).toBe('https://preview-popbox.vercel.app');
  });

  it('falls back to localhost for local development and local builds', () => {
    expect(resolveSiteUrl({})).toBe('http://localhost:3001');
  });
});
