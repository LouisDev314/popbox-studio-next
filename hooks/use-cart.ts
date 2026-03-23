import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ICartItem, type ICartProduct, type ICartSummary } from '@/interfaces/cart';
import { getKujiSellableQuantity, isKujiProduct } from '@/utils/kuji';
import { buildCartSummary } from '@/utils/cart';

export interface ICartActionResult {
  message: string | null;
  success: boolean;
}

interface ICartStore {
  items: ICartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (product: ICartProduct, quantity?: number) => ICartActionResult;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => ICartActionResult;
  clearCart: () => void;
  getCartSummary: () => ICartSummary;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.floor(quantity));
}

function getKujiAddErrorMessage(currentQuantity: number, sellableQuantity: number): string {
  if (sellableQuantity <= 0) {
    return 'This kuji is sold out.';
  }

  if (currentQuantity >= sellableQuantity) {
    return 'You already have the maximum available quantity in your cart.';
  }

  return `Only ${sellableQuantity - currentQuantity} ticket${sellableQuantity - currentQuantity === 1 ? '' : 's'} remaining.`;
}

function getKujiUpdateErrorMessage(sellableQuantity: number): string {
  if (sellableQuantity <= 0) {
    return 'This kuji is sold out.';
  }

  return `Only ${sellableQuantity} ticket${sellableQuantity === 1 ? '' : 's'} remaining.`;
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
        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };

        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === product.id,
          );

          if (isKujiProduct(product)) {
            const sellableQuantity = getKujiSellableQuantity(product) ?? 0;
            const currentQuantity = existingItemIndex > -1 ? state.items[existingItemIndex].quantity : 0;

            if (normalizedQuantity > Math.max(0, sellableQuantity - currentQuantity)) {
              result = {
                message: getKujiAddErrorMessage(currentQuantity, sellableQuantity),
                success: false,
              };
              return state;
            }
          }

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += normalizedQuantity;
            return { items: newItems };
          }

          return {
            items: [
              ...state.items,
              { id: crypto.randomUUID(), product, quantity: normalizedQuantity },
            ],
          };
        });

        return result;
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== cartItemId) {
              return item;
            }

            if (isKujiProduct(item.product)) {
              const sellableQuantity = getKujiSellableQuantity(item.product) ?? 0;

              if (normalizedQuantity > sellableQuantity && normalizedQuantity > item.quantity) {
                result = {
                  message: getKujiUpdateErrorMessage(sellableQuantity),
                  success: false,
                };
                return item;
              }
            }

            return { ...item, quantity: normalizedQuantity };
          }),
        }));

        return result;
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
