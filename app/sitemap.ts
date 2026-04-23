import type { MetadataRoute } from 'next';
import {
  getPublicCollections,
  getPublicProductsPage,
} from '@/lib/api/public-storefront';
import { buildAbsoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

const PRODUCTS_SITEMAP_PAGE_LIMIT = 50;
const SITEMAP_TIMEOUT_MS = 5000;

function createSitemapEntry(
  path: string,
  options?: Omit<MetadataRoute.Sitemap[number], 'url'>,
): MetadataRoute.Sitemap[number] {
  return {
    url: buildAbsoluteUrl(path),
    ...options,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getStaticEntries(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    createSitemapEntry('/', {
      changeFrequency: 'daily',
      lastModified,
      priority: 1,
    }),
    createSitemapEntry('/products', {
      changeFrequency: 'daily',
      lastModified,
      priority: 0.9,
    }),
    createSitemapEntry('/products?type=kuji', {
      changeFrequency: 'daily',
      lastModified,
      priority: 0.85,
    }),
    createSitemapEntry('/products?type=standard', {
      changeFrequency: 'daily',
      lastModified,
      priority: 0.85,
    }),
    createSitemapEntry('/about', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.7,
    }),
    createSitemapEntry('/ichiban-kuji', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.72,
    }),
    createSitemapEntry('/contact', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.7,
    }),
    createSitemapEntry('/faq', {
      changeFrequency: 'weekly',
      lastModified,
      priority: 0.65,
    }),
    createSitemapEntry('/legal/shipping-returns', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.55,
    }),
    createSitemapEntry('/legal/terms', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.45,
    }),
    createSitemapEntry('/legal/privacy', {
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.45,
    }),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = getStaticEntries();
  const entries = [...staticEntries];
  const seenUrls = new Set(entries.map((entry) => entry.url));

  try {
    const collections = await withTimeout(getPublicCollections(), SITEMAP_TIMEOUT_MS);

    for (const collection of collections) {
      if (!collection.isActive) {
        continue;
      }

      const entry = createSitemapEntry(`/collections/${encodeURIComponent(collection.slug)}`, {
        changeFrequency: 'weekly',
        priority: 0.75,
      });

      if (seenUrls.has(entry.url)) {
        continue;
      }

      seenUrls.add(entry.url);
      entries.push(entry);
    }
  } catch {
    return entries;
  }

  let cursor: string | undefined;

  for (let pageIndex = 0; pageIndex < PRODUCTS_SITEMAP_PAGE_LIMIT; pageIndex += 1) {
    try {
      const page = await withTimeout(getPublicProductsPage({ cursor }), SITEMAP_TIMEOUT_MS);

      for (const product of page.items) {
        const entry = createSitemapEntry(`/products/${product.slug}`, {
          changeFrequency: 'weekly',
          priority: 0.8,
        });

        if (seenUrls.has(entry.url)) {
          continue;
        }

        seenUrls.add(entry.url);
        entries.push(entry);
      }

      if (!page.nextCursor) {
        break;
      }

      cursor = page.nextCursor;
    } catch {
      break;
    }
  }

  return entries;
}
