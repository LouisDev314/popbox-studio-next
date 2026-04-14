import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';
import type { IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/lib/utils';
import { getProductInventoryState, getProductInventoryStatusLabel } from '@/utils/product-stock';
import Image from 'next/image';

const DENSE_PRODUCT_IMAGE_SIZES = '(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw';

interface IProductTileDenseProps {
  product: IProductCard;
  priority?: boolean;
  sizes?: string;
}

export function ProductTileDense(props: IProductTileDenseProps) {
  const { product, priority = false, sizes = DENSE_PRODUCT_IMAGE_SIZES } = props;
  const inventoryState = getProductInventoryState(product);
  const isSoldOut = inventoryState.hasInventoryData && inventoryState.status === 'sold_out';
  const stockLabel = product.productType === 'kuji' && !isSoldOut
    ? getProductInventoryStatusLabel(product)
    : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        {product.productType === 'kuji' && (
          <Image
            src="/logo-kuji.png"
            alt="Kuji"
            width={40}
            height={40}
            className="absolute left-2 top-2 z-10 h-5 w-auto"
          />
        )}

        <StorefrontImage
          src={product.images?.[0]?.url}
          alt={product.images?.[0]?.altText ?? product.name}
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

        <span className="text-sm font-semibold text-amber-500">
          {formatPrice(product.priceCents, product.currency)}
        </span>
      </div>
    </Link>
  );
}

export { DENSE_PRODUCT_IMAGE_SIZES };
