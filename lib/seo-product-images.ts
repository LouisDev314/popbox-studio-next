import getPublicEnvConfig from '@/configs/public-env';
import type { IProductImage } from '@/interfaces/product';

type TSeoProductImage = Pick<IProductImage, 'sortOrder' | 'storageKey' | 'url'>;

type TSeoImageConfig = {
  storageBucket?: string;
  supabaseUrl?: string;
};

const PRODUCT_STORAGE_PREFIX = 'products/';

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

function getValidatedStorageKey(value: string | null | undefined): string | null {
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
  const validatedStorageKey = getValidatedStorageKey(storageKey);

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

      const directUrl = getStableHttpsUrl(image.url);
      const resolvedUrl = directUrl
        ?? buildSupabaseProductImageUrl(image.storageKey, config);

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
