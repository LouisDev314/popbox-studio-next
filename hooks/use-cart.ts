import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import {
  type CartIssueCode,
  type ICartInvalidItem,
  type ICartItem,
  type ICartLineIdentity,
  type ICartMigrationNotice,
  type ICartProduct,
  type ICartSummary,
  type ICartVariantSnapshot,
} from '@/interfaces/cart';
import {
  buildCartSummary,
  getCartItemKey,
  getCartLineKey,
} from '@/utils/cart';
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
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics';

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
  migrationNotice: ICartMigrationNotice | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (
    product: ICartProduct,
    quantity?: number,
    variant?: ICartVariantSnapshot | null,
  ) => ICartActionResult;
  dismissMigrationNotice: () => void;
  removeItem: (cartItemId: string) => void;
  removeInvalidItem: (cartItemId: string) => void;
  removePurchasedLines: (identities: ICartLineIdentity[]) => void;
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

type ICartPersistedState = Pick<ICartStore, 'invalidItems' | 'items' | 'migrationNotice'>;

export const useCartStore = create<ICartStore>()(
  persist(
    (set, get) => ({
      invalidItems: [],
      items: [],
      migrationNotice: null,
      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      addItem: (product, quantity = 1, variant = null) => {
        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };
        const parsedProduct = validateCartProduct(product);

        if (!parsedProduct.success) {
          return {
            message: getCartIssueMessage(inferProductIssueCode(product)),
            success: false,
          };
        }

        if (parsedProduct.data.productType === 'standard' && !variant) {
          return {
            message: 'Select a product variant before adding this item to your cart.',
            success: false,
          };
        }

        if (parsedProduct.data.productType === 'kuji' && variant) {
          return {
            message: 'Kuji products do not use product variants.',
            success: false,
          };
        }

        set((state) => {
          clearCheckoutError();

          const nextIdentityKey = getCartLineKey({
            productId: parsedProduct.data.id,
            variantId: parsedProduct.data.productType === 'standard' ? variant?.id ?? null : null,
          });
          const existingItemIndex = state.items.findIndex(
            (item) => getCartItemKey(item) === nextIdentityKey,
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
            newItems[existingItemIndex].variant = variant;
            newItems[existingItemIndex].quantity += normalizedQuantity;
            return { items: newItems };
          }

          return {
            items: [
              ...state.items,
              {
                id: crypto.randomUUID(),
                product: parsedProduct.data,
                variant,
                quantity: normalizedQuantity,
              },
            ],
          };
        });

        if (result.success) {
          trackAddToCart(parsedProduct.data, normalizedQuantity, variant);
        }

        return result;
      },

      dismissMigrationNotice: () => {
        set({ migrationNotice: null });
      },

      removeItem: (cartItemId) => {
        if (isCartInteractionLocked()) {
          return;
        }

        const removedItem = get().items.find((item) => item.id === cartItemId);

        clearCheckoutError();

        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }));

        if (removedItem && !get().items.some((item) => item.id === cartItemId)) {
          trackRemoveFromCart([removedItem]);
        }
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

      removePurchasedLines: (identities) => {
        if (isCartInteractionLocked() || identities.length === 0) {
          return;
        }

        const purchasedKeys = new Set(identities.map(getCartLineKey));
        clearCheckoutError();
        set((state) => ({
          items: state.items.filter((item) => !purchasedKeys.has(getCartItemKey(item))),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (isCartInteractionLocked()) {
          return CHECKOUT_LOCKED_ACTION_RESULT;
        }

        const previousItem = get().items.find((item) => item.id === cartItemId);
        const normalizedQuantity = normalizeQuantity(quantity);
        let result: ICartActionResult = { message: null, success: true };

        clearCheckoutError();

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== cartItemId) {
              return item;
            }

            const sellableQuantity = item.product.productType === 'standard'
              ? 20
              : getProductSellableQuantity(item.product);

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

        const updatedItem = get().items.find((item) => item.id === cartItemId);

        if (result.success && previousItem && updatedItem) {
          const quantityDelta = updatedItem.quantity - previousItem.quantity;

          if (quantityDelta > 0) {
            trackAddToCart(updatedItem.product, quantityDelta, updatedItem.variant);
          } else if (quantityDelta < 0) {
            trackRemoveFromCart([{ ...previousItem, quantity: Math.abs(quantityDelta) }]);
          }
        }

        return result;
      },

      clearCart: () => {
        if (isCartInteractionLocked()) {
          return;
        }

        const removedItems = get().items;

        clearCheckoutError();

        set({ items: [], invalidItems: [], migrationNotice: null });

        if (removedItems.length > 0) {
          trackRemoveFromCart(removedItems);
        }
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
        migrationNotice: state.migrationNotice,
      }),
      migrate: (persistedState, version) => normalizeCartPersistedState(persistedState, version),
      version: CART_STORAGE_VERSION_NUMBER,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
