import { describe, expect, it, vi } from 'vitest';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION_NUMBER,
  parseCartStorageValue,
} from '@/utils/cart-storage';
import {
  createCartItem,
  createCartProduct,
  VALID_PRODUCT_ID,
} from '../fixtures';

async function importFreshCartStore() {
  vi.resetModules();
  const module = await import('@/hooks/use-cart');
  return module.useCartStore;
}

describe('useCartStore', () => {
  it('stores the backend UUID when adding an item', async () => {
    const useCartStore = await importFreshCartStore();
    const result = useCartStore.getState().addItem(createCartProduct(), 2);

    expect(result).toEqual({ message: null, success: true });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.product.id).toBe(VALID_PRODUCT_ID);
  });

  it('rejects adding a product with an invalid product id', async () => {
    const useCartStore = await importFreshCartStore();
    const result = useCartStore.getState().addItem(
      createCartProduct({ id: 'legacy-figure' }),
    );

    expect(result.success).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('classifies malformed persisted cart items as invalid items', () => {
    const parsedValue = parseCartStorageValue(JSON.stringify({
      state: {
        items: [
          createCartItem({
            product: createCartProduct({ id: 'legacy-figure' }),
          }),
        ],
      },
      version: 0,
    }));

    expect(parsedValue?.state.items).toHaveLength(0);
    expect(parsedValue?.state.invalidItems).toHaveLength(1);
    expect(parsedValue?.state.invalidItems[0]?.issueCode).toBe('invalid_product_id');
  });

  it('rehydrates legacy persisted items into invalidItems without crashing', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      state: {
        items: [
          createCartItem({
            product: createCartProduct({ id: 'legacy-figure' }),
          }),
        ],
      },
      version: 0,
    }));

    const useCartStore = await importFreshCartStore();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().invalidItems).toHaveLength(1);
    expect(useCartStore.getState().invalidItems[0]?.issueCode).toBe('invalid_product_id');

    const migratedInvalidItemId = useCartStore.getState().invalidItems[0]?.id;
    expect(migratedInvalidItemId).toBe('cart-item-1');

    useCartStore.getState().removeInvalidItem(migratedInvalidItemId!);
    expect(useCartStore.getState().invalidItems).toHaveLength(0);
  });

  it('writes persisted cart data using the current schema version', async () => {
    const useCartStore = await importFreshCartStore();

    const result = useCartStore.getState().addItem(createCartProduct(), 2);
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);

    expect(result).toEqual({ message: null, success: true });
    expect(storedValue).not.toBeNull();
    expect(JSON.parse(storedValue!)).toMatchObject({
      version: CART_STORAGE_VERSION_NUMBER,
      state: {
        invalidItems: [],
        items: [
          {
            product: {
              id: VALID_PRODUCT_ID,
            },
            quantity: 2,
          },
        ],
      },
    });
  });

  it('degrades malformed legacy persisted entries safely', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      state: {
        items: [
          null,
          {
            id: 'cart-item-2',
            product: {
              name: 'Broken figure',
            },
            quantity: 'two',
          },
        ],
        invalidItems: ['bad-persisted-item'],
      },
      version: 1,
    }));

    const useCartStore = await importFreshCartStore();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().invalidItems).toHaveLength(3);
  });
});
