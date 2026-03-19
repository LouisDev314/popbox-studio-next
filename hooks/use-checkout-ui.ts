'use client';

import { create } from 'zustand';

interface ICheckoutUiStore {
  isCheckingOut: boolean;
  setIsCheckingOut: (value: boolean) => void;
}

export const useCheckoutUiStore = create<ICheckoutUiStore>((set) => ({
  isCheckingOut: false,
  setIsCheckingOut: (value) => set({ isCheckingOut: value }),
}));
