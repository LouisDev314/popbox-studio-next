import { act, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  isVisibleStoreBanner: () => false,
  StorefrontBanner: () => null,
}));

vi.mock('@/components/layout/mobile-nav-overlay', () => ({
  MobileNavOverlay: ({
    ariaLabel,
    children,
    containerClassName,
  }: {
    ariaLabel: string;
    children: ReactNode;
    containerClassName?: string;
  }) => (
    <div
      className={containerClassName}
      data-testid={ariaLabel === 'Store navigation menu' ? 'store-menu-overlay' : 'store-search-overlay'}
    >
      {children}
    </div>
  ),
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
  beforeEach(() => {
    resetStores();
    navigationMock.pathname = '/';
    navigationMock.searchParams = new URLSearchParams();
    navigationMock.push.mockClear();
  });

  it('hides the storefront nav on checkout success until local cleanup completes for the session', () => {
    navigationMock.pathname = '/checkout/success';
    navigationMock.searchParams = new URLSearchParams('session_id=cs_test_123');

    renderWithProviders(<StoreHeaderClient collectionNavItems={[]} initialStoreBanner={null} />);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    act(() => {
      useCheckoutUiStore.getState().markCheckoutSuccessCleanupComplete('cs_test_123');
    });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PopBox Studio' })).toHaveAttribute('href', '/');
    expect(screen.getByAltText('PopBox Studio')).toHaveAttribute('src', expect.stringContaining('store-logo.png'));
  });

  it('uses the compact header below xl and preserves fly animation targets', () => {
    const { container } = renderWithProviders(
      <StoreHeaderClient collectionNavItems={[]} initialStoreBanner={null} />,
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    expect(primaryNav).toHaveClass('hidden', 'xl:flex', 'shrink-0', 'flex-nowrap');
    expect(primaryNav).not.toHaveClass('lg:flex');

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toHaveClass('xl:hidden', 'shrink-0');
    expect(menuButton).not.toHaveClass('lg:hidden');

    fireEvent.click(menuButton);

    expect(screen.getByTestId('store-menu-overlay')).toHaveClass('xl:hidden');
    expect(screen.getByTestId('store-menu-overlay')).not.toHaveClass('lg:hidden');

    const wishlistButton = screen.getByRole('button', { name: 'Open wishlist' });
    const cartButton = screen.getByRole('button', { name: 'Open cart' });
    expect(wishlistButton).toHaveAttribute('data-fly-target', 'wishlist');
    expect(cartButton).toHaveAttribute('data-fly-target', 'cart');
    expect(cartButton.parentElement).toHaveClass('shrink-0');

    const brandLink = screen.getByRole('link', { name: 'PopBox Studio' });
    expect(brandLink).toHaveClass('min-w-0', 'shrink-0');
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveClass(
      'hidden',
      'overflow-hidden',
      'text-ellipsis',
      'whitespace-nowrap',
      'sm:inline-block',
    );
  });
});
