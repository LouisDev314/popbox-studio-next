import {
  IAdminProduct,
  IAdminProductDetail,
  IAdminProductEditor,
  IAdminProductImage,
  IAdminProductImagePatch,
  IAdminProductImageUploadResponse,
  ITag,
} from '@/interfaces/product';
import getPublicEnvConfig from '@/configs/public-env';

const hasOwn = <Key extends PropertyKey>(
  value: object,
  key: Key,
): value is Record<Key, unknown> => Object.prototype.hasOwnProperty.call(value, key);

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
};

const normalizeSortOrder = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
};

const toAdminImageSourceList = (
  images?: IAdminProductImage[] | IAdminProductImageUploadResponse | null,
) => {
  if (!images) {
    return [] as IAdminProductImagePatch[];
  }

  return Array.isArray(images) ? images : [images];
};

const normalizeAdminImage = (
  image: IAdminProductImagePatch,
  fallbackSortOrder: number,
): IAdminProductImage | null => {
  const id = normalizeOptionalString(image.id);

  if (!id) {
    return null;
  }

  return {
    id,
    storageKey: normalizeOptionalString(image.storageKey),
    altText: hasOwn(image, 'altText') ? normalizeOptionalString(image.altText) : null,
    sortOrder: normalizeSortOrder(image.sortOrder, fallbackSortOrder),
    url: hasOwn(image, 'url') ? normalizeOptionalString(image.url) : null,
  };
};

export const parsePriceToCents = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const parsedValue = Number.parseFloat(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.round(parsedValue * 100);
};

export const parseWholeNumber = (value: string) => {
  if (!value) {
    return 0;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

export const toNullableText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
};

export const normalizeTagId = (value: string | number) => String(value);

export const extractTagIds = (tags?: Pick<ITag, 'id'>[] | null) =>
  tags?.map((tag) => normalizeTagId(tag.id)) ?? [];

export const normalizeAdminImages = (
  images?: IAdminProductImage[] | IAdminProductImageUploadResponse | null,
) => {
  return toAdminImageSourceList(images)
    .map((image, index) => normalizeAdminImage(image, index))
    .filter((image): image is IAdminProductImage => image !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
};

export const resolveAdminImageSrc = (
  url: string | null | undefined,
  storageKey: string | null | undefined,
) => {
  const normalizedUrl = normalizeOptionalString(url);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  const normalizedStorageKey = normalizeOptionalString(storageKey);

  if (!normalizedStorageKey) {
    return null;
  }

  const normalizedSupabaseUrl = normalizeOptionalString(getPublicEnvConfig().supabaseUrl);

  if (!normalizedSupabaseUrl) {
    return null;
  }

  return `${normalizedSupabaseUrl}/storage/v1/object/public/${normalizedStorageKey.replace(/^\/+/, '')}`;
};

export const mergeAdminImages = (
  currentImages: IAdminProductImage[],
  nextImages?: IAdminProductImage[] | IAdminProductImageUploadResponse | null,
) => {
  const normalizedCurrentImages = normalizeAdminImages(currentImages);

  if (nextImages === undefined) {
    return normalizedCurrentImages;
  }

  const currentImageMap = new Map(normalizedCurrentImages.map((image) => [image.id, image]));

  return toAdminImageSourceList(nextImages)
    .map((image, index) => {
      const normalizedId = normalizeOptionalString(image.id);

      if (!normalizedId) {
        return null;
      }

      const currentImage = currentImageMap.get(normalizedId);
      const normalizedImage = normalizeAdminImage(
        image,
        currentImage?.sortOrder ?? index,
      );

      if (!normalizedImage) {
        return null;
      }

      return {
        ...normalizedImage,
        storageKey: hasOwn(image, 'storageKey')
          ? normalizeOptionalString(image.storageKey)
          : currentImage?.storageKey ?? null,
        altText: hasOwn(image, 'altText')
          ? normalizeOptionalString(image.altText)
          : currentImage?.altText ?? null,
        sortOrder: normalizeSortOrder(image.sortOrder, normalizedImage.sortOrder),
        url: hasOwn(image, 'url')
          ? normalizeOptionalString(image.url)
          : currentImage?.url ?? null,
      };
    })
    .filter((image): image is IAdminProductImage => image !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
};

const getDefinedPatchValue = <Key extends keyof IAdminProduct & keyof IAdminProductEditor>(
  patch: Partial<IAdminProduct>,
  key: Key,
  fallback: IAdminProductEditor[Key],
): IAdminProductEditor[Key] => {
  const value = patch[key];

  return hasOwn(patch, key) && value !== undefined
    ? (value as IAdminProductEditor[Key])
    : fallback;
};

const getNullablePatchValue = <Key extends keyof IAdminProduct & keyof IAdminProductEditor>(
  patch: Partial<IAdminProduct>,
  key: Key,
  fallback: IAdminProductEditor[Key],
): IAdminProductEditor[Key] => {
  if (!hasOwn(patch, key)) {
    return fallback;
  }

  return (patch[key] ?? null) as IAdminProductEditor[Key];
};

export const mergeAdminProductIntoEditor = (
  currentProduct: IAdminProductEditor,
  patch?: Partial<IAdminProduct> | null,
): IAdminProductEditor => {
  if (!patch) {
    return currentProduct;
  }

  return {
    ...currentProduct,
    name: getDefinedPatchValue(patch, 'name', currentProduct.name),
    slug: getDefinedPatchValue(patch, 'slug', currentProduct.slug),
    description: getNullablePatchValue(patch, 'description', currentProduct.description),
    productType: getDefinedPatchValue(patch, 'productType', currentProduct.productType),
    status: getDefinedPatchValue(patch, 'status', currentProduct.status),
    priceCents: getDefinedPatchValue(patch, 'priceCents', currentProduct.priceCents),
    currency: getDefinedPatchValue(patch, 'currency', currentProduct.currency),
    sku: getNullablePatchValue(patch, 'sku', currentProduct.sku),
    collectionId: getNullablePatchValue(patch, 'collectionId', currentProduct.collectionId),
    inventory: getNullablePatchValue(patch, 'inventory', currentProduct.inventory),
    createdAt: getDefinedPatchValue(patch, 'createdAt', currentProduct.createdAt),
    updatedAt: getDefinedPatchValue(patch, 'updatedAt', currentProduct.updatedAt),
  };
};

export const mapAdminProductDetailToEditor = (product: IAdminProductDetail): IAdminProductEditor => ({
  ...product,
  description: product.description ?? null,
  collectionId: product.collection?.id ?? null,
  collection: product.collection ?? null,
  tags: product.tags ?? [],
  tagIds: extractTagIds(product.tags),
  images: normalizeAdminImages(product.images),
  inventory: product.inventory ?? null,
  kujiPrizes: product.kujiPrizes ?? [],
});
