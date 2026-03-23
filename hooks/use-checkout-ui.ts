'use client';

import { create } from 'zustand';

interface ICheckoutUiStore {
  isCheckingOut: boolean;
  beginCheckout: () => boolean;
  endCheckout: () => void;
}

export const useCheckoutUiStore = create<ICheckoutUiStore>((set, get) => ({
  isCheckingOut: false,

  beginCheckout: () => {
    if (get().isCheckingOut) {
      return false;
    }

    set({ isCheckingOut: true });
    return true;
  },

  endCheckout: () => set({ isCheckingOut: false }),
}));
