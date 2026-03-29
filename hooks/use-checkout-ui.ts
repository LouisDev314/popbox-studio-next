'use client';

import { create } from 'zustand';

interface ICheckoutUiStore {
  isCheckingOut: boolean;
  checkoutErrorMessage: string | null;
  beginCheckout: () => boolean;
  endCheckout: () => void;
  setCheckoutError: (message: string) => void;
  clearCheckoutError: () => void;
}

export const useCheckoutUiStore = create<ICheckoutUiStore>((set, get) => ({
  isCheckingOut: false,
  checkoutErrorMessage: null,

  beginCheckout: () => {
    if (get().isCheckingOut) {
      return false;
    }

    set({
      isCheckingOut: true,
      checkoutErrorMessage: null,
    });
    return true;
  },

  endCheckout: () => set({ isCheckingOut: false }),

  setCheckoutError: (message) => set({
    checkoutErrorMessage: message,
    isCheckingOut: false,
  }),

  clearCheckoutError: () => set({ checkoutErrorMessage: null }),
}));
