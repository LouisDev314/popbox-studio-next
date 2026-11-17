import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import getPublicEnvConfig from '@/configs/public-env';
import {
  getPublicCollections,
  getPublicProductsPage,
} from '@/lib/api/public-storefront';
import { PUBLIC_SITEMAP_CACHE_TAG } from '@/lib/api/public-cache-tags';
import { buildAbsoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const PRODUCTS_SITEMAP_PAGE_LIMIT = 50;
const SITEMAP_TIMEOUT_MS = 5000;
const SITEMAP_TOTAL_TIMEOUT_MS = 30_000;

function createSitemapEntry(
  path: string,
  options?: Omit<MetadataRoute.Sitemap[number], 'url'>,
): MetadataRoute.Sitemap[number] {
  return {
    url: buildAbsoluteUrl(path),
    ...options,
  };
}

function getStaticEntries(): MetadataRoute.Sitemap {
  return [
    createSitemapEntry('/', {
      changeFrequency: 'daily',
      priority: 1,
    }),
    createSitemapEntry('/products', {
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    createSitemapEntry('/products?type=kuji', {
      changeFrequency: 'daily',
      priority: 0.85,
    }),
    createSitemapEntry('/products?type=standard', {
      changeFrequency: 'daily',
      priority: 0.85,
    }),
    createSitemapEntry('/about', {
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    createSitemapEntry('/ichiban-kuji', {
      changeFrequency: 'monthly',
      priority: 0.72,
    }),
    createSitemapEntry('/contact', {
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    createSitemapEntry('/faq', {
      changeFrequency: 'weekly',
      priority: 0.65,
    }),
    createSitemapEntry('/legal/shipping-returns', {
      changeFrequency: 'monthly',
      priority: 0.55,
    }),
    createSitemapEntry('/legal/terms', {
      changeFrequency: 'monthly',
      priority: 0.45,
    }),
    createSitemapEntry('/legal/privacy', {
      changeFrequency: 'monthly',
      priority: 0.45,
    }),
  ];
}

function parseLastModified(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function buildCompleteSitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = getStaticEntries();
  const seenUrls = new Set(entries.map((entry) => entry.url));
  const signal = AbortSignal.timeout(SITEMAP_TOTAL_TIMEOUT_MS);
  const requestOptions = { signal, timeout: SITEMAP_TIMEOUT_MS };
  const collections = await getPublicCollections(requestOptions);

  for (const collection of collections) {
    if (!collection.isActive) {
      continue;
    }

    const entry = createSitemapEntry(`/collections/${encodeURIComponent(collection.slug)}`, {
      changeFrequency: 'weekly',
      priority: 0.75,
    });

    if (!seenUrls.has(entry.url)) {
      seenUrls.add(entry.url);
      entries.push(entry);
    }
  }

  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  for (let pageIndex = 0; pageIndex < PRODUCTS_SITEMAP_PAGE_LIMIT; pageIndex += 1) {
    signal.throwIfAborted();
    const page = await getPublicProductsPage({ cursor }, requestOptions);

    for (const product of page.items) {
      if (product.status !== 'active') {
        continue;
      }

      const lastModified = parseLastModified(product.updatedAt);
      const entry = createSitemapEntry(`/products/${product.slug}`, {
        changeFrequency: 'weekly',
        ...(lastModified ? { lastModified } : {}),
        priority: 0.8,
      });

      if (!seenUrls.has(entry.url)) {
        seenUrls.add(entry.url);
        entries.push(entry);
      }
    }

    if (!page.nextCursor) {
      return entries;
    }

    if (seenCursors.has(page.nextCursor)) {
      throw new Error('Catalog pagination repeated a sitemap cursor.');
    }
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }

  throw new Error('Catalog exceeds the sitemap traversal limit.');
}

const getCachedSitemap = unstable_cache(
  buildCompleteSitemap,
  ['storefront-sitemap-v1', getPublicEnvConfig().apiBaseUrl, getPublicEnvConfig().siteUrl],
  { revalidate: 3600, tags: [PUBLIC_SITEMAP_CACHE_TAG] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Cache only a complete successful traversal. Next retains the last successful
    // result if background revalidation fails; cold failures keep core URLs useful.
    return await getCachedSitemap();
  } catch {
    return getStaticEntries();
  }
}
