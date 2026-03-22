import {
  IAdminProduct,
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

const hasOwn = <Key extends PropertyKey>(
  value: object,
  key: Key,
): value is Record<Key, unknown> => Object.prototype.hasOwnProperty.call(value, key);

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
