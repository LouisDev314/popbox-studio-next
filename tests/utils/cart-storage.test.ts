import { describe, expect, it } from 'vitest';
import {
  CART_STORAGE_VERSION_NUMBER,
  hydrateCartItems,
  parseCartStorageValue,
} from '@/utils/cart-storage';
import {
  createCartItem,
  createCartProduct,
  VALID_VARIANT_ID,
} from '@/tests/fixtures';

describe('cart storage v3', () => {
  it('removes legacy standard lines, retains Kuji, and emits one notice', () => {
    const standard = createCartItem();
    const kuji = createCartItem({
      id: 'kuji-line',
      product: {
        productType: 'kuji',
        defaultVariantId: null,
        hasVariantChoices: false,
      },
      variant: null,
    });

    const parsed = parseCartStorageValue(JSON.stringify({
      state: { items: [standard, kuji], invalidItems: [] },
      version: 2,
    }));

    expect(parsed?.state.items).toEqual([
      expect.objectContaining({
        id: 'kuji-line',
        product: expect.objectContaining({ productType: 'kuji' }),
        variant: null,
      }),
    ]);
    expect(parsed?.state.migrationNotice).toEqual({
      code: 'legacy_standard_variants_removed',
      removedCount: 1,
    });
  });

  it('keeps different variants separate and merges identical line identities', () => {
    const first = createCartItem({ quantity: 2 });
    const duplicate = createCartItem({ id: 'duplicate', quantity: 3 });
    const other = createCartItem({
      id: 'other',
      variant: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Blue',
        priceCents: 5999,
      },
    });

    const hydrated = hydrateCartItems(
      [first, duplicate, other],
      CART_STORAGE_VERSION_NUMBER,
    );

    expect(hydrated.items).toHaveLength(2);
    expect(hydrated.items.find((item) => item.variant?.id === VALID_VARIANT_ID)?.quantity)
      .toBe(5);
    expect(hydrated.items.find((item) => item.variant?.name === 'Blue')?.quantity)
      .toBe(1);
  });

  it('rejects v3 standard lines without a concrete variant', () => {
    const hydrated = hydrateCartItems([
      {
        ...createCartItem(),
        product: createCartProduct(),
        variant: null,
      },
    ]);

    expect(hydrated.items).toHaveLength(0);
    expect(hydrated.invalidItems).toHaveLength(1);
  });
});
