import type { IProductCard, IProductImage } from '@/interfaces/product';

type ProductWithImages = Pick<IProductCard, 'images' | 'productType'>;

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
  return sortedImages[getProductCoverImageIndex(product)];
}
