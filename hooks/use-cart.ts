import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ICartItem, type ICartProduct, type ICartSummary } from '@/interfaces/cart';
import { buildCartSummary } from '@/utils/cart';
import {
  getProductSellableQuantity,
  getProductSoldOutMessage,
  getRemainingQuantityMessage,
  MAX_IN_CART_MESSAGE,
} from '@/utils/product-stock';

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

function getAddErrorMessage(product: ICartProduct, currentQuantity: number): string {
  const sellableQuantity = getProductSellableQuantity(product);

  if (sellableQuantity <= 0) {
    return getProductSoldOutMessage(product);
  }

  if (currentQuantity >= sellableQuantity) {
    return MAX_IN_CART_MESSAGE;
  }

  return getRemainingQuantityMessage(product, sellableQuantity - currentQuantity);
}

function getUpdateErrorMessage(product: ICartProduct, currentQuantity: number): string {
  const sellableQuantity = getProductSellableQuantity(product);

  if (sellableQuantity <= 0) {
    return getProductSoldOutMessage(product);
  }

  if (currentQuantity >= sellableQuantity) {
    return MAX_IN_CART_MESSAGE;
  }

  return getRemainingQuantityMessage(product, sellableQuantity);
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

          const currentQuantity = existingItemIndex > -1 ? state.items[existingItemIndex].quantity : 0;
          const sellableQuantity = getProductSellableQuantity(product);
          const maxAddableQuantity = Math.max(0, sellableQuantity - currentQuantity);

          if (normalizedQuantity > maxAddableQuantity) {
            result = {
              message: getAddErrorMessage(product, currentQuantity),
              success: false,
            };
            return state;
          }

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].product = product;
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

            const sellableQuantity = getProductSellableQuantity(item.product);

            if (normalizedQuantity > sellableQuantity && normalizedQuantity > item.quantity) {
              result = {
                message: getUpdateErrorMessage(item.product, item.quantity),
                success: false,
              };
              return item;
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
