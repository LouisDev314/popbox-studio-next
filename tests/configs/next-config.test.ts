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
