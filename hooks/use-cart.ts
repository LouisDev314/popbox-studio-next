import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IProductCard } from '@/interfaces/product';
import { type ICartItem, type ICartSummary } from '@/interfaces/cart';
import { buildCartSummary } from '@/utils/cart';

interface ICartStore {
  items: ICartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (product: IProductCard, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartSummary: () => ICartSummary;
}

export const useCartStore = create<ICartStore>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === product.id,
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems };
          }

          return {
            items: [
              ...state.items,
              { id: crypto.randomUUID(), product, quantity },
            ],
          };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item,
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getCartSummary: () => {
        return buildCartSummary(get().items);
      },
    }),
    {
      name: 'popbox-cart-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
