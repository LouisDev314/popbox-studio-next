'use client';

import Link from 'next/link';
import { type MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IProductCard } from '@/interfaces/product';
import { cn, formatPrice } from '@/lib/utils';
import { getProductCoverImage, getSortedProductImages } from '@/utils/product-images';
import { getProductInventoryState } from '@/utils/product-stock';
import { mapProductToWishlistItem } from '@/utils/wishlist';

const DENSE_PRODUCT_IMAGE_SIZES = '(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw';

interface IProductTileDenseProps {
  product: IProductCard;
  priority?: boolean;
  sizes?: string;
}

export function ProductTileDense(props: IProductTileDenseProps) {
  const { product, priority = false, sizes = DENSE_PRODUCT_IMAGE_SIZES } = props;
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const isWishlisted = useWishlistStore((state) => state.isProductWishlisted(product.id));
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlistItem);
  const inventoryState = getProductInventoryState(product);
  const isSoldOut = inventoryState.hasInventoryData && inventoryState.status === 'sold_out';
  const sortedImages = getSortedProductImages(product);
  const coverImage = getProductCoverImage(product);
  const fallbackImage = sortedImages[0]?.url !== coverImage?.url ? sortedImages[0] : undefined;
  const isWishlistActive = hasWishlistHydrated && isWishlisted;
  const wishlistLabel = isWishlistActive ? 'Remove from wishlist' : 'Add to wishlist';

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    toggleWishlistItem(mapProductToWishlistItem(product));
  };

  return (
    <div className="relative">
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-testid="product-card"
        data-product-slug={product.slug}
        data-product-type={product.productType}
      >
        <div className="relative aspect-square overflow-hidden rounded-xl">
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

      <button
        type="button"
        aria-label={wishlistLabel}
        aria-pressed={isWishlistActive}
        className={cn(
          'cursor-pointer absolute right-2 top-2 z-10 flex size-8 xl:size-10 items-center justify-center rounded-full border border-white/70 bg-white/85 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30  hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ',
          isWishlistActive && 'border-primary/30 text-primary',
        )}
        onClick={handleWishlistClick}
        data-testid="product-card-wishlist-toggle"
      >
        <Heart
          aria-hidden="true"
          className={cn(
            'size-4.5 xl:size-5',
            isWishlistActive && 'fill-current',
          )}
        />
      </button>
    </div>
  );
}

export { DENSE_PRODUCT_IMAGE_SIZES };
