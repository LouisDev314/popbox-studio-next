import Image from 'next/image';
import Link from 'next/link';
import { StorefrontCarouselClient } from '@/components/home/storefront-carousel-client';
import { cn, formatPrice } from '@/lib/utils';
import type { IProductCard } from '@/interfaces/product';
import { getProductCoverImage } from '@/utils/product-images';

interface IStorefrontCarouselProps {
  featuredProducts: IProductCard[];
  className?: string;
}

function getCarouselEyebrowLabel(product: IProductCard) {
  if (product.productType === 'kuji') {
    return 'Ichiban Kuji';
  }

  return product.collections[0]?.name ?? 'PopBox Studio Pick';
}

function buildFallbackLabel(label: string) {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    return 'PB';
  }

  const words = trimmedLabel.split(/\s+/).slice(0, 2);
  const initials = words.map((word) => word[0]?.toUpperCase() ?? '').join('');

  return initials || trimmedLabel.slice(0, 2).toUpperCase();
}

export function StorefrontCarousel(props: IStorefrontCarouselProps) {
  const { featuredProducts } = props;

  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  return (
    <StorefrontCarouselClient className={props.className} slideCount={featuredProducts.length}>
      {featuredProducts.map((product, index) => {
        const image = getProductCoverImage(product);

        return (
          <div
            key={product.id}
            className="relative min-w-0 flex-[0_0_100%]"
          >
            <div className="relative lg:flex lg:w-full lg:justify-center">
              <Link
                href={`/products/${product.slug}`}
                className="group/slide relative block w-full"
              >
                <div className="relative aspect-[1.85/1] w-full overflow-hidden sm:aspect-[2/1]">
                  <div
                    className={cn(
                      'absolute inset-0 h-full w-full bg-[radial-gradient(circle_at_20%_0%,rgba(239,158,191,0.2),transparent_34%),linear-gradient(160deg,#1c1016_0%,#32202a_54%,#130d10_100%)] lg:bg-none',
                      !image?.url && 'flex items-center justify-center',
                    )}
                  >
                    {image?.url ? (
                      <Image
                        src={image.url}
                        alt={image.altText ?? product.name}
                        fill
                        loading={index === 0 ? 'eager' : 'lazy'}
                        priority={index === 0}
                        sizes="100vw"
                        className="object-cover object-center transition-transform duration-700 ease-out group-hover/slide:scale-[1.02]"
                      />
                    ) : (
                      <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-white/82 uppercase shadow-none backdrop-blur-sm">
                        {buildFallbackLabel(product.name)}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 via-45% to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 text-white sm:px-7 sm:pb-6 sm:pt-20 lg:px-10 lg:pb-9 lg:pt-20 xl:px-12 xl:pb-10">
                    <div className="min-w-0 xl:max-w-2xl">
                      <p className="mb-2 text-[10px] font-semibold tracking-[0.28em] text-white/72 uppercase sm:mb-3 sm:text-xs">
                        {getCarouselEyebrowLabel(product)}
                      </p>
                      <p className="line-clamp-2 text-2xl leading-[0.98] font-semibold tracking-[-0.03em] sm:text-3xl md:text-4xl">
                        {product.name}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-white/78 sm:mt-2 sm:text-base">
                        {formatPrice(product.priceCents, product.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </StorefrontCarouselClient>
  );
}
