import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

describe('Next.js redirects', () => {
  it('permanently redirects the legacy home route before rendering', async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toContainEqual({
      source: '/home',
      destination: '/',
      permanent: true,
    });
  });
});

describe('Next.js image widths', () => {
  it('uses the restrained responsive widths needed by storefront and fixed thumbnails', () => {
    expect(nextConfig.images?.deviceSizes).toEqual([414, 640, 768, 828, 1024, 1280, 1536, 1920]);
    expect(nextConfig.images?.imageSizes).toEqual([32, 48, 64, 96, 128, 256]);
  });
});
