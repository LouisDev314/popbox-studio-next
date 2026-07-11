import getPublicEnvConfig from '@/configs/public-env';
import type { IProductImage } from '@/interfaces/product';

type TSeoProductImage = Pick<IProductImage, 'sortOrder' | 'storageKey' | 'url'>;

type TSeoImageConfig = {
  siteUrl?: string;
  storageBucket?: string;
  supabaseUrl?: string;
};

const PRODUCT_STORAGE_PREFIX = 'products/';
const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStableHttpsUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);

    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getStableSiteUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    const isLocalHttp = url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');

    if (
      (url.protocol !== 'https:' && !isLocalHttp)
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function validateProductImageStorageKey(value: string | null | undefined): string | null {
  const candidate = value?.trim().replace(/^\/+/, '');

  if (
    !candidate
    || !candidate.startsWith(PRODUCT_STORAGE_PREFIX)
    || candidate.includes('\\')
    || candidate.includes('?')
    || candidate.includes('#')
  ) {
    return null;
  }

  let decodedCandidate: string;

  try {
    decodedCandidate = decodeURIComponent(candidate);
  } catch {
    return null;
  }

  const segments = decodedCandidate.split('/');

  if (
    segments.length < 3
    || !PRODUCT_ID_PATTERN.test(segments[1] ?? '')
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null;
  }

  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function buildSupabaseProductImageUrl(
  storageKey: string | null | undefined,
  config: TSeoImageConfig = {},
): string | null {
  const validatedStorageKey = validateProductImageStorageKey(storageKey);

  if (!validatedStorageKey) {
    return null;
  }

  const publicConfig = getPublicEnvConfig();
  const supabaseUrl = getStableHttpsUrl(config.supabaseUrl ?? publicConfig.supabaseUrl);
  const storageBucket = (config.storageBucket ?? publicConfig.supabaseStorageBucket).trim();

  if (!supabaseUrl || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(storageBucket)) {
    return null;
  }

  return new URL(
    `/storage/v1/object/public/${encodeURIComponent(storageBucket)}/${validatedStorageKey}`,
    supabaseUrl,
  ).toString();
}

export function buildSeoProductImageUrl(
  storageKey: string | null | undefined,
  config: TSeoImageConfig = {},
): string | null {
  const validatedStorageKey = validateProductImageStorageKey(storageKey);

  if (!validatedStorageKey) {
    return null;
  }

  const publicConfig = getPublicEnvConfig();
  const siteUrl = getStableSiteUrl(config.siteUrl ?? publicConfig.siteUrl);

  if (!siteUrl) {
    return null;
  }

  return new URL(`/media/product-images/${validatedStorageKey}`, siteUrl).toString();
}

export function resolveSeoProductImages(
  images: readonly TSeoProductImage[] | null | undefined,
  config: TSeoImageConfig = {},
): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  const resolvedImages = images
    .map((image, index) => ({ image, index }))
    .sort((left, right) => {
      const leftSortOrder = Number.isFinite(left.image?.sortOrder)
        ? left.image.sortOrder
        : Number.MAX_SAFE_INTEGER;
      const rightSortOrder = Number.isFinite(right.image?.sortOrder)
        ? right.image.sortOrder
        : Number.MAX_SAFE_INTEGER;

      return leftSortOrder === rightSortOrder
        ? left.index - right.index
        : leftSortOrder - rightSortOrder;
    })
    .flatMap(({ image }) => {
      if (!image || typeof image !== 'object') {
        return [];
      }

      const resolvedUrl = buildSeoProductImageUrl(image.storageKey, config);

      return resolvedUrl ? [resolvedUrl] : [];
    });

  return [...new Set(resolvedImages)];
}

export function resolvePrimarySeoProductImage(
  images: readonly TSeoProductImage[] | null | undefined,
  config: TSeoImageConfig = {},
): string | null {
  return resolveSeoProductImages(images, config)[0] ?? null;
}
