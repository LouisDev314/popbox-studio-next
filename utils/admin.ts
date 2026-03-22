import {
  IAdminProduct,
  IAdminProductDetail,
  IAdminProductEditor,
  IAdminProductImage,
  IAdminProductImagePatch,
  IAdminProductImageUploadResponse,
  ITag,
} from '@/interfaces/product';

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

export const mergeAdminProductIntoEditor = (
  currentProduct: IAdminProductEditor,
  patch?: Partial<IAdminProduct> | null,
): IAdminProductEditor => {
  if (!patch) {
    return currentProduct;
  }

  return {
    ...currentProduct,
    name: hasOwn(patch, 'name') && patch.name !== undefined ? patch.name : currentProduct.name,
    slug: hasOwn(patch, 'slug') && patch.slug !== undefined ? patch.slug : currentProduct.slug,
    description: hasOwn(patch, 'description') ? patch.description ?? null : currentProduct.description,
    productType: hasOwn(patch, 'productType') && patch.productType !== undefined ? patch.productType : currentProduct.productType,
    status: hasOwn(patch, 'status') && patch.status !== undefined ? patch.status : currentProduct.status,
    priceCents: hasOwn(patch, 'priceCents') && patch.priceCents !== undefined ? patch.priceCents : currentProduct.priceCents,
    currency: hasOwn(patch, 'currency') && patch.currency !== undefined ? patch.currency : currentProduct.currency,
    sku: hasOwn(patch, 'sku') ? patch.sku ?? null : currentProduct.sku,
    collectionId: hasOwn(patch, 'collectionId') ? patch.collectionId ?? null : currentProduct.collectionId,
    inventory: hasOwn(patch, 'inventory') ? patch.inventory ?? null : currentProduct.inventory,
    createdAt: hasOwn(patch, 'createdAt') && patch.createdAt !== undefined ? patch.createdAt : currentProduct.createdAt,
    updatedAt: hasOwn(patch, 'updatedAt') && patch.updatedAt !== undefined ? patch.updatedAt : currentProduct.updatedAt,
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
