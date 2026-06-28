import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('uses production storefront metadata and only references existing icon assets', () => {
    const config = manifest();

    expect(config).toMatchObject({
      name: 'PopBox Studio',
      short_name: 'PopBox',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      lang: 'en-CA',
      background_color: '#fffafc',
      theme_color: '#f7d6df',
      categories: ['shopping', 'lifestyle'],
    });
    expect(config.icons).toEqual([
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ]);
  });
});
