import type { IProductCard, IProductImage } from '@/interfaces/product';

type ProductWithImages = Pick<IProductCard, 'images' | 'productType'>;

function replaceKujiCoverAssetPath(value: string | null): string | null {
  return value?.replace(/cover-webp(?=($|[?#]))/, 'product-webp') ?? null;
}

function getKujiProductImageFromCoverImage(image: IProductImage): IProductImage | undefined {
  const productImageUrl = replaceKujiCoverAssetPath(image.url);

  if (!productImageUrl || productImageUrl === image.url) {
    return undefined;
  }

  return {
    ...image,
    id: `${image.id}-product-cover`,
    storageKey: replaceKujiCoverAssetPath(image.storageKey) ?? image.storageKey,
    url: productImageUrl,
  };
}

export function getSortedProductImages(product: ProductWithImages): IProductImage[] {
  return product.images
    .map((image, index) => ({ image, index }))
    .sort((left, right) => {
      if (left.image.sortOrder !== right.image.sortOrder) {
        return left.image.sortOrder - right.image.sortOrder;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.image);
}

export function getProductCoverImageIndex(product: ProductWithImages): number {
  const sortedImages = getSortedProductImages(product);

  if (product.productType === 'kuji' && sortedImages.length > 1) {
    return 1;
  }

  return 0;
}

export function getProductCoverImage(product: ProductWithImages): IProductImage | undefined {
  const sortedImages = getSortedProductImages(product);
  const coverImage = sortedImages[getProductCoverImageIndex(product)];

  if (product.productType === 'kuji' && sortedImages.length === 1 && coverImage) {
    return getKujiProductImageFromCoverImage(coverImage) ?? coverImage;
  }

  return coverImage;
}
