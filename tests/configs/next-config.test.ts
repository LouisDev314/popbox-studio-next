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

describe('Next.js image optimization', () => {
  it('uses the restrained variants needed by storefront and fixed thumbnails', () => {
    expect(nextConfig.images?.deviceSizes).toEqual([414, 640, 768, 828, 1024, 1280, 1536, 1920]);
    expect(nextConfig.images?.imageSizes).toEqual([32, 48, 64, 96, 128, 256]);
    expect(nextConfig.images?.formats).toEqual(['image/webp']);
    expect(nextConfig.images?.qualities).toEqual([75]);
    expect(nextConfig.images?.minimumCacheTTL).toBe(2678400);
  });

  it('only allows product images from the configured Supabase public bucket', () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(remotePatterns).toContainEqual({
      protocol: 'https',
      hostname: 'bpclnekuanwtojarniyc.supabase.co',
      pathname: '/storage/v1/object/public/product-images/products/**',
    });
    expect(remotePatterns.length).toBeGreaterThan(0);
    expect(remotePatterns.every((pattern) => (
      pattern.protocol === 'https'
      && pattern.pathname === '/storage/v1/object/public/product-images/products/**'
    ))).toBe(true);

    const productImageUrl = new URL(
      'https://bpclnekuanwtojarniyc.supabase.co/storage/v1/object/public/product-images/products/product-id/prize.webp',
    );
    const unrelatedBucketUrl = new URL(
      'https://bpclnekuanwtojarniyc.supabase.co/storage/v1/object/public/avatars/products/product-id/prize.webp',
    );
    const unrelatedPathUrl = new URL(
      'https://bpclnekuanwtojarniyc.supabase.co/storage/v1/object/public/product-images/admin/previews/prize.webp',
    );
    const allowedPrefix = '/storage/v1/object/public/product-images/products/';

    expect(productImageUrl.pathname.startsWith(allowedPrefix)).toBe(true);
    expect(unrelatedBucketUrl.pathname.startsWith(allowedPrefix)).toBe(false);
    expect(unrelatedPathUrl.pathname.startsWith(allowedPrefix)).toBe(false);
  });
});
