import { describe, expect, it, vi } from 'vitest';

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    supabaseUrl: 'https://supabase.example.co',
  }),
}));

import { resolveAdminImageSrc } from '@/utils/admin';

describe('admin image helpers', () => {
  it('prefers a direct image url over storage-based fallback', () => {
    expect(resolveAdminImageSrc('https://cdn.example.com/product.jpg', 'products/product.jpg')).toBe(
      'https://cdn.example.com/product.jpg',
    );
  });

  it('builds a storage-backed url when the direct url is absent', () => {
    expect(resolveAdminImageSrc(null, 'products/first.jpg')).toBe(
      'https://supabase.example.co/storage/v1/object/public/products/first.jpg',
    );
  });
});
