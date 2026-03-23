import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { type IWishlistItem } from '@/interfaces/wishlist';
import { WISHLIST_STORAGE_KEY } from '@/utils/wishlist';

interface IWishlistStore {
  items: IWishlistItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  getWishlistItems: () => IWishlistItem[];
  addWishlistItem: (item: IWishlistItem) => void;
  removeWishlistItem: (productId: string) => void;
  toggleWishlistItem: (item: IWishlistItem) => void;
  isProductWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
}

type IWishlistPersistedState = Pick<IWishlistStore, 'items'>;

function isWishlistItem(value: unknown): value is IWishlistItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<IWishlistItem>;

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.slug === 'string' &&
    (item.imageUrl === null || typeof item.imageUrl === 'string') &&
    typeof item.priceCents === 'number' &&
    typeof item.currency === 'string' &&
    (item.productType === 'standard' || item.productType === 'kuji')
  );
}

function parseWishlistStorageValue(storedValue: string): StorageValue<IWishlistPersistedState> | null {
  const parsedValue: unknown = JSON.parse(storedValue);

  if (!parsedValue || typeof parsedValue !== 'object') {
    return null;
  }

  const state = (parsedValue as { state?: unknown }).state;
  const version = (parsedValue as { version?: unknown }).version;

  if (!state || typeof state !== 'object') {
    return null;
  }

  const items = (state as { items?: unknown }).items;

  if (!Array.isArray(items) || !items.every(isWishlistItem)) {
    return null;
  }

  if (version !== undefined && typeof version !== 'number') {
    return null;
  }

  return {
    state: {
      items,
    },
    version: typeof version === 'number' ? version : 0,
  };
}

const wishlistStorage: PersistStorage<IWishlistPersistedState> = {
  getItem: (name) => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedValue = window.localStorage.getItem(name);
    if (!storedValue) {
      return null;
    }

    try {
      return parseWishlistStorageValue(storedValue);
    } catch {
      window.localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(name);
  },
};

export const useWishlistStore = create<IWishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      getWishlistItems: () => {
        return get().items;
      },

      addWishlistItem: (item) => {
        set((state) => {
          if (state.items.some((wishlistItem) => wishlistItem.id === item.id)) {
            return state;
          }

          return {
            items: [...state.items, item],
          };
        });
      },

      removeWishlistItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      toggleWishlistItem: (item) => {
        set((state) => {
          if (state.items.some((wishlistItem) => wishlistItem.id === item.id)) {
            return {
              items: state.items.filter((wishlistItem) => wishlistItem.id !== item.id),
            };
          }

          return {
            items: [...state.items, item],
          };
        });
      },

      isProductWishlisted: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: WISHLIST_STORAGE_KEY,
      storage: wishlistStorage,
      partialize: (state) => ({
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
