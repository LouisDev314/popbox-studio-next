import {
  IAdminProductDetail,
  IAdminProductEditor,
  IAdminProductImage,
  IAdminProductImageUploadResponse,
  ITag,
} from '@/interfaces/product';

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
  if (!images) {
    return [] as IAdminProductImage[];
  }

  const imageList = Array.isArray(images) ? images : [images];

  return imageList
    .map((image) => ({
      id: image.id,
      storageKey: image.storageKey,
      altText: image.altText ?? null,
      sortOrder: image.sortOrder,
      url: image.url ?? null,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
};

export const mergeAdminImages = (
  currentImages: IAdminProductImage[],
  nextImages?: IAdminProductImage[] | IAdminProductImageUploadResponse | null,
) => {
  if (nextImages === undefined) {
    return currentImages;
  }

  const normalizedImages = normalizeAdminImages(nextImages);
  const currentImageMap = new Map(currentImages.map((image) => [image.id, image]));

  return normalizedImages.map((image) => {
    const currentImage = currentImageMap.get(image.id);

    return {
      ...currentImage,
      ...image,
      url: image.url ?? currentImage?.url ?? null,
    };
  });
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
