import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  it('allows public storefront routes and disallows private or thin crawl targets', () => {
    const config = robots();
    const rules = config.rules as Exclude<typeof config.rules, undefined>;

    expect(rules).toMatchObject({
      userAgent: '*',
      allow: '/',
      disallow: expect.arrayContaining([
        '/admin',
        '/api',
        '/cart',
        '/checkout',
        '/orders',
        '/search/results',
      ]),
    });
    expect(config.sitemap).toBe('http://localhost:3001/sitemap.xml');
    expect(config.host).toBe('http://localhost:3001');
  });
});
