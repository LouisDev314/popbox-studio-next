import type { MetadataRoute } from 'next';
import {
  BRAND_NAME,
  DEFAULT_SITE_DESCRIPTION,
} from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: 'PopBox',
    description: DEFAULT_SITE_DESCRIPTION,

    start_url: '/',
    scope: '/',
    display: 'standalone',

    lang: 'en-CA',

    background_color: '#fffafc',
    theme_color: '#f7d6df',

    categories: ['shopping', 'lifestyle'],

    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
