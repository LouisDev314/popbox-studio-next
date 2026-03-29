import { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { CART_STORAGE_KEY } from '@/utils/cart-storage';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

export function resetStores() {
  useCartStore.setState({
    hasHydrated: true,
    invalidItems: [],
    items: [],
  });
  useCheckoutUiStore.setState({
    checkoutErrorMessage: null,
    isCheckingOut: false,
  });
  window.localStorage.removeItem(CART_STORAGE_KEY);
}
