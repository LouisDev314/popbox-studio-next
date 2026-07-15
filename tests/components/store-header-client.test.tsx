import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreHeaderClient } from '@/components/layout/store-header-client';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { renderWithProviders, resetStores } from '../test-utils';

const navigationMock = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
  push: vi.fn(),
}));

const analyticsMock = vi.hoisted(() => ({
  trackSearch: vi.fn(),
}));

const mobileSearchMock = vi.hoisted(() => ({
  props: null as null | {
    onSearchQueryChange: (value: string) => void;
    onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    push: navigationMock.push,
  }),
  useSearchParams: () => navigationMock.searchParams,
}));

vi.mock('@/lib/analytics', () => analyticsMock);

vi.mock('@/components/layout/store-banner', () => ({
  StorefrontBanner: () => null,
}));

vi.mock('@/components/layout/mobile-nav-overlay', () => ({
  MobileNavOverlay: ({
    ariaLabel,
    children,
    containerClassName,
    isOpen,
  }: {
    ariaLabel: string;
    children: ReactNode;
    containerClassName?: string;
    isOpen: boolean;
  }) => (
    <div
      className={containerClassName}
      data-open={isOpen}
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
  MobileSearchPanel: (props: NonNullable<typeof mobileSearchMock.props>) => {
    mobileSearchMock.props = props;
    return null;
  },
}));

vi.mock('@/components/cart/cart-drawer', () => ({
  CartDrawer: ({ isOpen }: { isOpen: boolean }) => <div data-testid="cart-drawer" data-open={isOpen} />,
}));

vi.mock('@/components/wishlist/wishlist-drawer', () => ({
  WishlistDrawer: ({ isOpen }: { isOpen: boolean }) => <div data-testid="wishlist-drawer" data-open={isOpen} />,
}));

vi.mock('@/hooks/use-mobile-navbar-visibility', () => ({
  useMobileNavbarVisibility: () => true,
}));

interface IStoreHeaderHarnessHandle {
  rerenderForRouteChange: () => void;
}

const StoreHeaderHarness = forwardRef<IStoreHeaderHarnessHandle>(function StoreHeaderHarness(_, ref) {
  const [, setVersion] = useState(0);

  useImperativeHandle(ref, () => ({
    rerenderForRouteChange: () => setVersion((version) => version + 1),
  }), []);

  return <StoreHeaderClient collectionNavItems={[]} />;
});

describe('StoreHeaderClient', () => {
  beforeEach(() => {
    resetStores();
    navigationMock.pathname = '/';
    navigationMock.searchParams = new URLSearchParams();
    navigationMock.push.mockClear();
    analyticsMock.trackSearch.mockClear();
    mobileSearchMock.props = null;
  });

  it('hides the storefront nav on checkout success until local cleanup completes for the session', () => {
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

  it('uses the compact header below xl and preserves fly animation targets', () => {
    const { container } = renderWithProviders(<StoreHeaderClient collectionNavItems={[]} />);

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    expect(primaryNav).toHaveClass('hidden', 'xl:flex', 'shrink-0', 'flex-nowrap');
    expect(primaryNav).not.toHaveClass('lg:flex');

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toHaveClass('xl:hidden', 'shrink-0');
    expect(menuButton).not.toHaveClass('lg:hidden');

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

  it('tracks searches submitted through the global search panel', () => {
    renderWithProviders(<StoreHeaderClient collectionNavItems={[]} />);

    act(() => {
      mobileSearchMock.props?.onSearchQueryChange(' kuji ');
    });

    const preventDefault = vi.fn();
    act(() => {
      mobileSearchMock.props?.onSearchSubmit({ preventDefault } as FormEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(analyticsMock.trackSearch).toHaveBeenCalledWith('kuji');
    expect(navigationMock.push).toHaveBeenCalledWith('/search/results?q=kuji');
  });

  it('closes every header overlay when the route changes', async () => {
    const harnessRef = createRef<IStoreHeaderHarnessHandle>();
    renderWithProviders(<StoreHeaderHarness ref={harnessRef} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    expect(screen.getByTestId('store-search-overlay')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Open wishlist' }));
    expect(screen.getByTestId('wishlist-drawer')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Open cart' }));
    expect(screen.getByTestId('cart-drawer')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByTestId('store-menu-overlay')).toHaveAttribute('data-open', 'true');

    navigationMock.pathname = '/products';
    act(() => harnessRef.current?.rerenderForRouteChange());

    await waitFor(() => {
      expect(screen.getByTestId('store-search-overlay')).toHaveAttribute('data-open', 'false');
      expect(screen.getByTestId('wishlist-drawer')).toHaveAttribute('data-open', 'false');
      expect(screen.getByTestId('cart-drawer')).toHaveAttribute('data-open', 'false');
      expect(screen.getByTestId('store-menu-overlay')).toHaveAttribute('data-open', 'false');
    });
  });
});
