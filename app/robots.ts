import type { MetadataRoute } from 'next';
import getPublicEnvConfig from '@/configs/public-env';
import { buildAbsoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin'],
    },
    host: getPublicEnvConfig().siteUrl,
    sitemap: buildAbsoluteUrl('/sitemap.xml'),
  };
}
