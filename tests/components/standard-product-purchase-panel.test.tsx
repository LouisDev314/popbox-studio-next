import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StandardProductPurchasePanel } from '@/components/product/standard-product-purchase-panel';
import type { IProduct } from '@/interfaces/product';
import { createProductCard, VALID_VARIANT_ID } from '@/tests/fixtures';

const actionProps = vi.hoisted(() => vi.fn());

vi.mock('@/components/product/product-actions', () => ({
  ProductActions: (props: unknown) => {
    actionProps(props);
    return <div data-testid="actions" />;
  },
}));

function createProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    ...createProductCard(),
    sku: null,
    tags: [],
    kujiPrizes: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    variants: [{
      id: VALID_VARIANT_ID,
      name: 'Small',
      priceCents: 2499,
      sortOrder: 0,
      isAvailable: true,
    }],
    priceRange: { minCents: 2499, maxCents: 2499, isRange: false },
    ...overrides,
  };
}

describe('StandardProductPurchasePanel', () => {
  it('automatically uses one hidden default variant without showing a selector', () => {
    render(<StandardProductPurchasePanel product={createProduct()} />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(actionProps).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedVariant: expect.objectContaining({ id: VALID_VARIANT_ID }),
    }));
  });

  it('selects the active default, updates price, and keeps sold-out choices visible', () => {
    const blueId = '44444444-4444-4444-8444-444444444444';
    render(<StandardProductPurchasePanel product={createProduct({
      defaultVariantId: VALID_VARIANT_ID,
      hasVariantChoices: true,
      variants: [
        {
          id: VALID_VARIANT_ID,
          name: 'Small',
          priceCents: 2499,
          sortOrder: 0,
          isAvailable: true,
        },
        {
          id: blueId,
          name: 'Blue',
          priceCents: 3499,
          sortOrder: 1,
          isAvailable: true,
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          name: 'Sold out',
          priceCents: 3999,
          sortOrder: 2,
          isAvailable: false,
        },
      ],
    })} />);

    expect(screen.getByRole('radio', { name: /small/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /sold out/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /blue/i }));
    expect(screen.getAllByText('$34.99')).toHaveLength(2);
    expect(actionProps).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedVariant: expect.objectContaining({ id: blueId }),
    }));
  });
});
