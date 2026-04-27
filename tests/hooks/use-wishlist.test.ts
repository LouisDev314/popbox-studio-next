import { describe, expect, it, vi } from 'vitest';
import { WISHLIST_STORAGE_KEY } from '@/utils/wishlist';
import {
  createWishlistItem,
  VALID_PRODUCT_ID,
} from '../fixtures';

async function importFreshWishlistStore() {
  vi.resetModules();
  const wishlistStoreModule = await import('@/hooks/use-wishlist');
  return wishlistStoreModule.useWishlistStore;
}

function getPersistedWishlistItems(): unknown[] {
  const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  expect(storedValue).not.toBeNull();

  const parsedValue = JSON.parse(storedValue!) as {
    state: {
      items: unknown[];
    };
  };

  return parsedValue.state.items;
}

describe('useWishlistStore', () => {
  it('does not create duplicate wishlist entries', async () => {
    const useWishlistStore = await importFreshWishlistStore();
    const item = createWishlistItem();

    useWishlistStore.getState().addWishlistItem(item);
    useWishlistStore.getState().addWishlistItem(item);

    expect(useWishlistStore.getState().items).toHaveLength(1);
    expect(getPersistedWishlistItems()).toHaveLength(1);
  });

  it('removes a wishlist item from state and persisted storage', async () => {
    const useWishlistStore = await importFreshWishlistStore();

    useWishlistStore.getState().addWishlistItem(createWishlistItem());
    useWishlistStore.getState().removeWishlistItem(VALID_PRODUCT_ID);

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(getPersistedWishlistItems()).toHaveLength(0);
  });

  it('treats removing a missing wishlist item as a safe no-op', async () => {
    const useWishlistStore = await importFreshWishlistStore();

    useWishlistStore.getState().addWishlistItem(createWishlistItem());
    useWishlistStore.getState().removeWishlistItem('missing-product-id');

    expect(useWishlistStore.getState().items).toEqual([createWishlistItem()]);
    expect(getPersistedWishlistItems()).toHaveLength(1);
  });
});
