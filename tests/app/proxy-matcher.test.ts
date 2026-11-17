import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';
import { config } from '@/proxy';

describe('session proxy matcher', () => {
  it.each([
    '/media/product-images/products/example/extensionless',
    '/media/product-images/products/example/main.webp',
    '/_next/static/chunks/app.js',
    '/_next/image?url=image&w=640&q=75',
    '/sitemap.xml',
  ])('does not invoke auth middleware for %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });

  it.each(['/admin', '/admin/login', '/api/v1/admin/products', '/account', '/products'])
  ('retains middleware coverage for %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });
});
