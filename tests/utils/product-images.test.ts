import { describe, expect, it } from 'vitest';
import { getProductCoverImage, getSortedProductImages } from '@/utils/product-images';
import { createProductCard } from '../fixtures';

describe('product image helpers', () => {
  it('sorts product images by sortOrder without mutating the source images', () => {
    const product = createProductCard({
      images: [
        {
          id: 'second',
          storageKey: 'products/second.jpg',
          altText: 'Second image',
          sortOrder: 1,
          url: 'https://example.com/products/second.jpg',
        },
        {
          id: 'first',
          storageKey: 'products/first.jpg',
          altText: 'First image',
          sortOrder: 0,
          url: 'https://example.com/products/first.jpg',
        },
      ],
    });

    const sortedImages = getSortedProductImages(product);

    expect(sortedImages.map((image) => image.id)).toEqual(['first', 'second']);
    expect(product.images.map((image) => image.id)).toEqual(['second', 'first']);
  });

  it('uses the second sorted image for kuji covers and the first sorted image for standard covers', () => {
    const images = [
      {
        id: 'display-cover',
        storageKey: 'products/display-cover.jpg',
        altText: 'Display cover',
        sortOrder: 1,
        url: 'https://example.com/products/display-cover.jpg',
      },
      {
        id: 'banner',
        storageKey: 'products/banner.jpg',
        altText: 'Banner',
        sortOrder: 0,
        url: 'https://example.com/products/banner.jpg',
      },
    ];

    expect(getProductCoverImage(createProductCard({ productType: 'kuji', images }))?.id).toBe('display-cover');
    expect(getProductCoverImage(createProductCard({ productType: 'standard', images }))?.id).toBe('banner');
  });

  it('derives kuji product artwork when card payloads only include the cover-webp image', () => {
    const coverImage = {
      id: 'cover-image',
      storageKey: 'products/kuji-blue-lock-cover-webp',
      altText: 'Blue Lock cover',
      sortOrder: 0,
      url: 'https://example.com/products/kuji-blue-lock-cover-webp',
    };

    expect(getProductCoverImage(createProductCard({
      productType: 'kuji',
      images: [coverImage],
    }))).toMatchObject({
      altText: 'Blue Lock cover',
      storageKey: 'products/kuji-blue-lock-product-webp',
      url: 'https://example.com/products/kuji-blue-lock-product-webp',
    });

    expect(getProductCoverImage(createProductCard({
      productType: 'standard',
      images: [coverImage],
    }))?.url).toBe('https://example.com/products/kuji-blue-lock-cover-webp');
  });
});
