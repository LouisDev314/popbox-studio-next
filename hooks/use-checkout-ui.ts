'use client';

import { create } from 'zustand';

export interface ICheckoutDialogState {
  actionLabel?: string;
  message: string;
  title: string;
}

interface ICheckoutUiStore {
  checkoutErrorMessage: string | null;
  checkoutSuccessCleanupSessionId: string | null;
  checkoutDialog: ICheckoutDialogState | null;
  isCheckingOut: boolean;
  beginCheckout: () => boolean;
  clearCheckoutDialog: () => void;
  endCheckout: () => void;
  markCheckoutSuccessCleanupComplete: (sessionId: string) => void;
  clearCheckoutError: () => void;
  setCheckoutError: (message: string) => void;
  showCheckoutDialog: (dialog: ICheckoutDialogState) => void;
}

export const useCheckoutUiStore = create<ICheckoutUiStore>((set, get) => ({
  checkoutErrorMessage: null,
  checkoutSuccessCleanupSessionId: null,
  checkoutDialog: null,
  isCheckingOut: false,

  beginCheckout: () => {
    if (get().isCheckingOut) {
      return false;
    }

    set({
      isCheckingOut: true,
      checkoutErrorMessage: null,
      checkoutDialog: null,
    });
    return true;
  },

  clearCheckoutDialog: () => set({ checkoutDialog: null }),

  endCheckout: () => set({ isCheckingOut: false }),

  markCheckoutSuccessCleanupComplete: (sessionId) => set({
    checkoutSuccessCleanupSessionId: sessionId,
  }),

  setCheckoutError: (message) => set({
    checkoutErrorMessage: message,
    checkoutDialog: null,
    isCheckingOut: false,
  }),

  showCheckoutDialog: (dialog) => set({
    checkoutDialog: {
      actionLabel: dialog.actionLabel ?? 'Okay',
      message: dialog.message,
      title: dialog.title,
    },
    checkoutErrorMessage: null,
    isCheckingOut: false,
  }),

  clearCheckoutError: () => set({ checkoutErrorMessage: null }),
}));
