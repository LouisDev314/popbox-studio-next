import { describe, expect, it } from 'vitest';
import {
  buildSeoProductImageUrl,
  buildSupabaseProductImageUrl,
  resolvePrimarySeoProductImage,
  resolveSeoProductImages,
} from '@/lib/seo-product-images';

const imageConfig = {
  siteUrl: 'https://www.popboxstudio.com',
  storageBucket: 'product-images',
  supabaseUrl: 'https://project-ref.supabase.co',
};
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

describe('SEO product images', () => {
  it('builds an absolute stable Supabase URL from a validated product storage key', () => {
    const storageKey = `products/${PRODUCT_ID}/front image.webp`;
    const supabaseImageUrl = buildSupabaseProductImageUrl(
      storageKey,
      imageConfig,
    );
    const repeatedSupabaseImageUrl = buildSupabaseProductImageUrl(
      storageKey,
      imageConfig,
    );

    expect(supabaseImageUrl).toBe(
      'https://project-ref.supabase.co/storage/v1/object/public/product-images/products/11111111-1111-4111-8111-111111111111/front%20image.webp',
    );
    expect(repeatedSupabaseImageUrl).toBe(supabaseImageUrl);
    expect(new URL(supabaseImageUrl ?? '').search).toBe('');
    expect(new URL(supabaseImageUrl ?? '').hash).toBe('');
    expect(buildSupabaseProductImageUrl(
      `/${storageKey}`,
      imageConfig,
    )).toBe(supabaseImageUrl);
    expect(buildSeoProductImageUrl(
      `products/${PRODUCT_ID}/front image.webp`,
      imageConfig,
    )).toBe(
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/front%20image.webp`,
    );
  });

  it('sorts images stably, selects the first image, and deduplicates URLs', () => {
    const images = [
      {
        storageKey: `products/${PRODUCT_ID}/second.webp`,
        sortOrder: 2,
        url: 'https://cdn.example.com/second.webp',
      },
      {
        storageKey: `products/${PRODUCT_ID}/first.webp`,
        sortOrder: 1,
        url: 'https://cdn.example.com/first.webp',
      },
      {
        storageKey: `products/${PRODUCT_ID}/second.webp`,
        sortOrder: 2,
        url: 'https://cdn.example.com/second.webp',
      },
    ];

    expect(resolveSeoProductImages(images, imageConfig)).toEqual([
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/first.webp`,
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/second.webp`,
    ]);
    expect(resolvePrimarySeoProductImage(images, imageConfig)).toBe(
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/first.webp`,
    );
  });

  it('uses constrained same-origin URLs regardless of the API image URL shape', () => {
    expect(resolveSeoProductImages([
      {
        storageKey: `products/${PRODUCT_ID}/relative.webp`,
        sortOrder: 0,
        url: '/relative.webp',
      },
      {
        storageKey: `products/${PRODUCT_ID}/insecure.webp`,
        sortOrder: 1,
        url: 'http://cdn.example.com/insecure.webp',
      },
      {
        storageKey: `products/${PRODUCT_ID}/signed.webp`,
        sortOrder: 2,
        url: 'https://cdn.example.com/signed.webp?token=secret&expires=123',
      },
    ], imageConfig)).toEqual([
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/relative.webp`,
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/insecure.webp`,
      `https://www.popboxstudio.com/media/product-images/products/${PRODUCT_ID}/signed.webp`,
    ]);
  });

  it('rejects malformed and traversal-like values without inventing a fallback', () => {
    expect(resolveSeoProductImages([
      {
        storageKey: `products/${PRODUCT_ID}/../secret.webp`,
        sortOrder: 0,
        url: '',
      },
      {
        storageKey: 'avatars/product-1/image.webp',
        sortOrder: 1,
        url: 'javascript:alert(1)',
      },
      {
        storageKey: `products/${PRODUCT_ID}/%2e%2e/secret.webp`,
        sortOrder: 2,
        url: 'not-a-url',
      },
    ], imageConfig)).toEqual([]);
    expect(resolvePrimarySeoProductImage([], imageConfig)).toBeNull();
    expect(resolveSeoProductImages(undefined, imageConfig)).toEqual([]);
  });
});
