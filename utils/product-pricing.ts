import type { IProductCard } from '@/interfaces/product';
import { formatPrice } from '@/lib/utils';

export type ProductPricePresentation = {
  availabilityLabel: 'Sold out' | 'Unavailable' | null;
  priceLabel: string | null;
};

function isValidPrice(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function getProductPricePresentation(
  product: Pick<
    IProductCard,
    'currency' | 'hasPriceRange' | 'isSoldOut' | 'minPriceCents' | 'maxPriceCents'
  >,
): ProductPricePresentation {
  if (
    !isValidPrice(product.minPriceCents)
    || !isValidPrice(product.maxPriceCents)
    || product.maxPriceCents < product.minPriceCents
  ) {
    return {
      availabilityLabel: 'Unavailable',
      priceLabel: null,
    };
  }

  return {
    availabilityLabel: product.isSoldOut ? 'Sold out' : null,
    priceLabel: `${product.hasPriceRange ? 'From ' : ''}${formatPrice(
      product.minPriceCents,
      product.currency,
    )}`,
  };
}
