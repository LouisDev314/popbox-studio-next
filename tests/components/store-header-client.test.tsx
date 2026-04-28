import { act, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StoreHeaderClient } from '@/components/layout/store-header-client';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { renderWithProviders, resetStores } from '../test-utils';

const navigationMock = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    push: navigationMock.push,
  }),
  useSearchParams: () => navigationMock.searchParams,
}));

vi.mock('@/components/layout/store-banner', () => ({
  StorefrontBanner: () => null,
}));

vi.mock('@/components/layout/mobile-nav-overlay', () => ({
  MobileNavOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/mobile-menu-panel', () => ({
  MobileMenuPanel: () => null,
}));

vi.mock('@/components/layout/mobile-search-panel', () => ({
  MobileSearchPanel: () => null,
}));

vi.mock('@/components/cart/cart-drawer', () => ({
  CartDrawer: () => null,
}));

vi.mock('@/components/wishlist/wishlist-drawer', () => ({
  WishlistDrawer: () => null,
}));

vi.mock('@/hooks/use-mobile-navbar-visibility', () => ({
  useMobileNavbarVisibility: () => true,
}));

describe('StoreHeaderClient', () => {
  it('hides the storefront nav on checkout success until local cleanup completes for the session', () => {
    resetStores();
    navigationMock.pathname = '/checkout/success';
    navigationMock.searchParams = new URLSearchParams('session_id=cs_test_123');

    renderWithProviders(<StoreHeaderClient collectionNavItems={[]} />);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    act(() => {
      useCheckoutUiStore.getState().markCheckoutSuccessCleanupComplete('cs_test_123');
    });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PopBox Studio' })).toHaveAttribute('href', '/');
    expect(screen.getByAltText('PopBox Studio')).toHaveAttribute('src', expect.stringContaining('store-logo.png'));
  });
});
