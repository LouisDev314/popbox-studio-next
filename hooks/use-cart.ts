import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IProductCard } from '@/interfaces/product';

export interface CartItem {
  id: string; // unique ID for cart row, handles duplicates if needed
  product: IProductCard;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: IProductCard, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { totalItems: number; totalCents: number };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          // If product already exists in cart, increment quantity
          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === product.id,
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems };
          }

          // Otherwise add new line item
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
            item.id === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        }));
      },
      clearCart: () => {
        set({ items: [] });
      },
      getCartTotal: () => {
        const { items } = get();
        return items.reduce(
          (acc, item) => {
            acc.totalItems += item.quantity;
            acc.totalCents += item.product.priceCents * item.quantity;
            return acc;
          },
          { totalItems: 0, totalCents: 0 },
        );
      },
    }),
    {
      name: 'popbox-cart-storage',
    },
  ),
);
