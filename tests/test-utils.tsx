import { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { StorefrontAlertProvider } from '@/components/storefront/storefront-alert-provider';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { CART_STORAGE_KEY } from '@/utils/cart-storage';
import { WISHLIST_STORAGE_KEY } from '@/utils/wishlist';

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
      <StorefrontAlertProvider>
        {ui}
      </StorefrontAlertProvider>
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
    checkoutSuccessCleanupSessionId: null,
    checkoutDialog: null,
    isCheckingOut: false,
  });
  useWishlistStore.setState({
    hasHydrated: true,
    items: [],
  });
  window.localStorage.removeItem(CART_STORAGE_KEY);
  window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
}
