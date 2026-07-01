import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('uses production storefront metadata and references the app icon', () => {
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
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ]);
  });
});
