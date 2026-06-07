/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';
import type { IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/lib/utils';
import { getProductCoverImage, getSortedProductImages } from '@/utils/product-images';
import { getProductInventoryState } from '@/utils/product-stock';

const DENSE_PRODUCT_IMAGE_SIZES = '(max-width: 639px) calc((100vw - 2rem) / 3), (max-width: 767px) calc((100vw - 3rem) / 3), (max-width: 1279px) calc((100vw - 4.5rem) / 4), calc((100vw - 6rem) / 5)';

interface IProductTileDenseProps {
  product: IProductCard;
  priority?: boolean;
  sizes?: string;
}

export function ProductTileDense(props: IProductTileDenseProps) {
  const { product, priority = false, sizes = DENSE_PRODUCT_IMAGE_SIZES } = props;
  const inventoryState = getProductInventoryState(product);
  const isSoldOut = inventoryState.hasInventoryData && inventoryState.status === 'sold_out';
  const sortedImages = getSortedProductImages(product);
  const coverImage = getProductCoverImage(product);
  const fallbackImage = sortedImages[0]?.url !== coverImage?.url ? sortedImages[0] : undefined;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      data-testid="product-card"
      data-product-slug={product.slug}
      data-product-type={product.productType}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        {product.productType === 'kuji' && (
          <img
            src="/logo-kuji.png"
            alt="Kuji"
            width={40}
            height={40}
            className="absolute left-2 top-2 z-10 h-5 sm:h-7 w-auto"
          />
        )}

        <StorefrontImage
          src={coverImage?.url}
          fallbackSrc={fallbackImage?.url}
          alt={coverImage?.altText ?? product.name}
          label={product.name}
          priority={priority}
          sizes={sizes}
          imageClassName="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />

        {isSoldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-white text-xs font-semibold tracking-wide">SOLD OUT</span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 px-0.5 flex flex-col gap-1">
        <p className="line-clamp-2 text-sm leading-4 text-foreground">
          {product.name}
        </p>

        <span className="text-sm font-semibold text-primary">
          {formatPrice(product.priceCents, product.currency)}
        </span>
      </div>
    </Link>
  );
}

export { DENSE_PRODUCT_IMAGE_SIZES };
