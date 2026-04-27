import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import {
  type CartIssueCode,
  type ICartInvalidItem,
  type ICartItem,
  type ICartProduct,
  type ICartSummary,
} from '@/interfaces/cart';
import { buildCartSummary } from '@/utils/cart';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION_NUMBER,
  createCartStorage,
  getCartIssueMessage,
  normalizeCartPersistedState,
  validateCartProduct,
} from '@/utils/cart-storage';
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

const CHECKOUT_LOCKED_ACTION_RESULT: ICartActionResult = {
  message: null,
  success: false,
};

function isCartInteractionLocked(): boolean {
  return useCheckoutUiStore.getState().isCheckingOut;
}

function clearCheckoutError(): void {
  useCheckoutUiStore.getState().clearCheckoutError();
}

interface ICartStore {
  invalidItems: ICartInvalidItem[];
  items: ICartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (product: ICartProduct, quantity?: number) => ICartActionResult;
  removeItem: (cartItemId: string) => void;
  removeInvalidItem: (cartItemId: string) => void;
  removePurchasedProductIds: (productIds: string[]) => void;
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

function inferProductIssueCode(product: unknown): CartIssueCode {
  const parsedProduct = validateCartProduct(product);

  if (parsedProduct.success) {
    return 'invalid_cart_item';
  }

  return parsedProduct.error.issues.some((issue) => issue.path.join('.') === 'id')
    ? 'invalid_product_id'
    : 'missing_product_data';
}

type ICartPersistedState = Pick<ICartStore, 'invalidItems' | 'items'>;

export const useCartStore = create<ICartStore>()(
  persist(
    (set, get) => ({
      invalidItems: [],
      items: [],
      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      addItem: (product, quantity = 1) => {
        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };
        const parsedProduct = validateCartProduct(product);

        if (!parsedProduct.success) {
          return {
            message: getCartIssueMessage(inferProductIssueCode(product)),
            success: false,
          };
        }

        set((state) => {
          clearCheckoutError();

          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === parsedProduct.data.id,
          );

          const currentQuantity = existingItemIndex > -1 ? state.items[existingItemIndex].quantity : 0;
          const sellableQuantity = getProductSellableQuantity(parsedProduct.data);
          const maxAddableQuantity = Math.max(0, sellableQuantity - currentQuantity);

          if (normalizedQuantity > maxAddableQuantity) {
            result = {
              message: getAddErrorMessage(parsedProduct.data, currentQuantity),
              success: false,
            };
            return state;
          }

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].product = parsedProduct.data;
            newItems[existingItemIndex].quantity += normalizedQuantity;
            return { items: newItems };
          }

          return {
            items: [
              ...state.items,
              {
                id: crypto.randomUUID(),
                product: parsedProduct.data,
                quantity: normalizedQuantity,
              },
            ],
          };
        });

        return result;
      },

      removeItem: (cartItemId) => {
        if (isCartInteractionLocked()) {
          return;
        }

        clearCheckoutError();

        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }));
      },

      removeInvalidItem: (cartItemId) => {
        if (isCartInteractionLocked()) {
          return;
        }

        clearCheckoutError();

        set((state) => ({
          invalidItems: state.invalidItems.filter((item) => item.id !== cartItemId),
        }));
      },

      removePurchasedProductIds: (productIds) => {
        if (isCartInteractionLocked() || productIds.length === 0) {
          return;
        }

        const purchasedProductIdSet = new Set(productIds);

        clearCheckoutError();

        set((state) => ({
          items: state.items.filter((item) => !purchasedProductIdSet.has(item.product.id)),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (isCartInteractionLocked()) {
          return CHECKOUT_LOCKED_ACTION_RESULT;
        }

        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };

        clearCheckoutError();

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
        if (isCartInteractionLocked()) {
          return;
        }

        clearCheckoutError();

        set({ items: [], invalidItems: [] });
      },

      getCartSummary: () => {
        return buildCartSummary(get().items);
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createCartStorage<ICartPersistedState>(CART_STORAGE_KEY),
      partialize: (state) => ({
        items: state.items,
        invalidItems: state.invalidItems,
      }),
      migrate: (persistedState) => normalizeCartPersistedState(persistedState),
      version: CART_STORAGE_VERSION_NUMBER,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
