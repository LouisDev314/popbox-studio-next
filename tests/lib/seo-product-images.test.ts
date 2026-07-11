import { describe, expect, it } from 'vitest';
import {
  buildSupabaseProductImageUrl,
  resolvePrimarySeoProductImage,
  resolveSeoProductImages,
} from '@/lib/seo-product-images';

const imageConfig = {
  storageBucket: 'product-images',
  supabaseUrl: 'https://project-ref.supabase.co',
};

describe('SEO product images', () => {
  it('builds an absolute stable Supabase URL from a validated product storage key', () => {
    expect(buildSupabaseProductImageUrl(
      'products/11111111-1111-4111-8111-111111111111/front image.webp',
      imageConfig,
    )).toBe(
      'https://project-ref.supabase.co/storage/v1/object/public/product-images/products/11111111-1111-4111-8111-111111111111/front%20image.webp',
    );
  });

  it('sorts images stably, selects the first image, and deduplicates URLs', () => {
    const images = [
      {
        storageKey: 'products/product-1/second.webp',
        sortOrder: 2,
        url: 'https://cdn.example.com/second.webp',
      },
      {
        storageKey: 'products/product-1/first.webp',
        sortOrder: 1,
        url: 'https://cdn.example.com/first.webp',
      },
      {
        storageKey: 'products/product-1/duplicate.webp',
        sortOrder: 2,
        url: 'https://cdn.example.com/second.webp',
      },
    ];

    expect(resolveSeoProductImages(images, imageConfig)).toEqual([
      'https://cdn.example.com/first.webp',
      'https://cdn.example.com/second.webp',
    ]);
    expect(resolvePrimarySeoProductImage(images, imageConfig)).toBe(
      'https://cdn.example.com/first.webp',
    );
  });

  it('converts storage keys when direct URLs are relative, insecure, or expiring', () => {
    expect(resolveSeoProductImages([
      {
        storageKey: 'products/product-1/relative.webp',
        sortOrder: 0,
        url: '/relative.webp',
      },
      {
        storageKey: 'products/product-1/insecure.webp',
        sortOrder: 1,
        url: 'http://cdn.example.com/insecure.webp',
      },
      {
        storageKey: 'products/product-1/signed.webp',
        sortOrder: 2,
        url: 'https://cdn.example.com/signed.webp?token=secret&expires=123',
      },
    ], imageConfig)).toEqual([
      'https://project-ref.supabase.co/storage/v1/object/public/product-images/products/product-1/relative.webp',
      'https://project-ref.supabase.co/storage/v1/object/public/product-images/products/product-1/insecure.webp',
      'https://project-ref.supabase.co/storage/v1/object/public/product-images/products/product-1/signed.webp',
    ]);
  });

  it('rejects malformed and traversal-like values without inventing a fallback', () => {
    expect(resolveSeoProductImages([
      {
        storageKey: 'products/product-1/../secret.webp',
        sortOrder: 0,
        url: '',
      },
      {
        storageKey: 'avatars/product-1/image.webp',
        sortOrder: 1,
        url: 'javascript:alert(1)',
      },
      {
        storageKey: 'products/product-1/%2e%2e/secret.webp',
        sortOrder: 2,
        url: 'not-a-url',
      },
    ], imageConfig)).toEqual([]);
    expect(resolvePrimarySeoProductImage([], imageConfig)).toBeNull();
    expect(resolveSeoProductImages(undefined, imageConfig)).toEqual([]);
  });
});
