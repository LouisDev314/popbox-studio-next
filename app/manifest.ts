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
    display: 'standalone',
    background_color: '#fffafc',
    theme_color: '#f7d6df',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
