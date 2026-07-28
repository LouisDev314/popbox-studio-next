import { describe, expect, it } from 'vitest';
import { getProductPricePresentation } from '@/utils/product-pricing';
import { createProductCard } from '@/tests/fixtures';

describe('getProductPricePresentation', () => {
  it('formats exact and ranged standard prices from listing summaries', () => {
    expect(getProductPricePresentation(createProductCard())).toEqual({
      availabilityLabel: null,
      priceLabel: '$49.99',
    });
    expect(getProductPricePresentation(createProductCard({
      minPriceCents: 2499,
      maxPriceCents: 4999,
      hasPriceRange: true,
    }))).toEqual({
      availabilityLabel: null,
      priceLabel: 'From $24.99',
    });
  });

  it('reports sold-out and invalid summary states without variant requests', () => {
    expect(getProductPricePresentation(createProductCard({ isSoldOut: true })))
      .toMatchObject({ availabilityLabel: 'Sold out' });
    expect(getProductPricePresentation(createProductCard({
      minPriceCents: 5000,
      maxPriceCents: 4999,
    }))).toEqual({
      availabilityLabel: 'Unavailable',
      priceLabel: null,
    });
  });
});
