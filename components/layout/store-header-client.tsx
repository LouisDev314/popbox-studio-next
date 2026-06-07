'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Heart, Search, ShoppingBag } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { MobileNavOverlay } from '@/components/layout/mobile-nav-overlay';
import { StorefrontBanner, isVisibleStoreBanner } from '@/components/layout/store-banner';
import {
  DESKTOP_PRIMARY_NAV_ITEMS,
  FEATURED_NAV_HREF,
  getActiveTopLevelNavKey,
  IStoreCollectionNavItem,
  isStoreNavItemActive,
} from '@/components/layout/store-navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMobileNavbarVisibility } from '@/hooks/use-mobile-navbar-visibility';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProductSuggestion, IProductSuggestionResponse } from '@/interfaces/product';
import type { IStoreBannerSettings } from '@/interfaces/settings';
import { formatQuantity } from '@/lib/format-quantity';
import { FLY_TARGET_REQUEST_EVENT } from '@/lib/ui/fly-to-target';
import { cn } from '@/lib/utils';

const CartDrawer = dynamic(
  () => import('@/components/cart/cart-drawer').then((module) => module.CartDrawer),
  { ssr: false },
);
const MobileMenuPanel = dynamic(
  () => import('@/components/layout/mobile-menu-panel').then((module) => module.MobileMenuPanel),
  { ssr: false },
);
const MobileSearchPanel = dynamic(
  () => import('@/components/layout/mobile-search-panel').then((module) => module.MobileSearchPanel),
  { ssr: false },
);
const WishlistDrawer = dynamic(
  () => import('@/components/wishlist/wishlist-drawer').then((module) => module.WishlistDrawer),
  { ssr: false },
);

type TMobilePanel = 'menu' | 'search' | null;

const WISHLIST_BUTTON_ID = 'store-wishlist-trigger';
const MOBILE_CART_BUTTON_ID = 'store-mobile-cart-trigger';
const MOBILE_MENU_BUTTON_ID = 'store-mobile-menu-trigger';
const MOBILE_SEARCH_BUTTON_ID = 'store-mobile-search-trigger';
const MOBILE_SEARCH_INPUT_ID = 'store-mobile-search-input';
const COLLECTIONS_MENU_TRIGGER_ID = 'store-collections-menu-trigger';
const FLY_TARGET_HEADER_REVEAL_MS = 900;

interface IStoreHeaderActionsProps {
  hasCartHydrated: boolean;
  hasWishlistHydrated: boolean;
  isMenuOpen: boolean;
  isSearchOpen: boolean;
  onCartOpen: () => void;
  onMenuToggle: () => void;
  onSearchToggle: () => void;
  onWishlistOpen: () => void;
  totalItems: number;
  totalWishlistItems: number;
}

interface IStoreHeaderClientProps {
  collectionNavItems: IStoreCollectionNavItem[];
  initialStoreBanner: IStoreBannerSettings | null;
}

interface IHeaderDeferredSurfacesProps {
  autocompleteSuggestions: IProductSuggestion[];
  collectionNavItems: IStoreCollectionNavItem[];
  hasCartDrawerMounted: boolean;
  hasMobileMenuMounted: boolean;
  hasMobileSearchMounted: boolean;
  hasWishlistDrawerMounted: boolean;
  isAutocompleteError: boolean;
  isAutocompletePending: boolean;
  isCartOpen: boolean;
  isMenuOpen: boolean;
  isSearchOpen: boolean;
  isWishlistOpen: boolean;
  onCartClose: () => void;
  onMenuClose: () => void;
  onMenuNavigate: () => void;
  onNavigate: (href: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestionSelect: (suggestion: IProductSuggestion) => void;
  onWishlistClose: () => void;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
}

function getDesktopNavItemClassName(isActive: boolean, isTrigger = false) {
  return cn(
    'relative inline-flex h-9 items-center px-3 py-2 text-sm font-medium tracking-tight whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 after:absolute after:right-3 after:bottom-1 after:left-3 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:content-[""]',
    isActive
      ? 'text-foreground after:scale-x-100'
      : 'text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100',
    isTrigger &&
      (isActive
        ? 'data-popup-open:rounded-full data-popup-open:bg-muted/55 data-popup-open:text-foreground data-popup-open:after:scale-x-100 data-open:rounded-full data-open:bg-muted/55 data-open:text-foreground data-open:after:scale-x-100 data-open:focus:text-foreground'
        : 'data-popup-open:rounded-full data-popup-open:bg-muted/55 data-popup-open:text-foreground data-popup-open:after:scale-x-100 data-open:rounded-full data-open:bg-muted/55 data-open:text-foreground data-open:after:scale-x-100 data-open:focus:text-foreground'),
  );
}

function StoreHeaderActions(props: IStoreHeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        id={MOBILE_SEARCH_BUTTON_ID}
        type="button"
        aria-expanded={props.isSearchOpen}
        aria-label={props.isSearchOpen ? 'Close search' : 'Open search'}
        className={cn(
          'rounded-full border border-transparent p-2 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          props.isSearchOpen ? 'bg-accent text-foreground' : 'bg-background',
        )}
        onClick={props.onSearchToggle}
      >
        <Search className="h-5 w-5" />
      </button>

      <button
        id={WISHLIST_BUTTON_ID}
        type="button"
        data-fly-target="wishlist"
        className="relative rounded-full border border-transparent bg-background p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={props.onWishlistOpen}
      >
        <span className="sr-only">Open wishlist</span>
        <Heart className="h-5 w-5" />
        {props.hasWishlistHydrated && props.totalWishlistItems > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {formatQuantity(props.totalWishlistItems)}
          </span>
        ) : null}
      </button>

      <button
        id={MOBILE_CART_BUTTON_ID}
        type="button"
        data-fly-target="cart"
        className="relative rounded-full border border-transparent bg-background p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={props.onCartOpen}
      >
        <span className="sr-only">Open cart</span>
        <ShoppingBag className="h-5 w-5" />
        {props.hasCartHydrated && props.totalItems > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {formatQuantity(props.totalItems)}
          </span>
        ) : null}
      </button>

      <button
        id={MOBILE_MENU_BUTTON_ID}
        type="button"
        aria-expanded={props.isMenuOpen}
        aria-label={props.isMenuOpen ? 'Close menu' : 'Open menu'}
        className={cn(
          'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border p-2 text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 xl:hidden',
          props.isMenuOpen ? 'border-primary/30 bg-accent' : 'border-border/60 bg-background',
        )}
        onClick={props.onMenuToggle}
      >
        <span className="sr-only">{props.isMenuOpen ? 'Close menu' : 'Open menu'}</span>
        <span className="relative block h-4 w-5">
          <span
            className={cn(
              'absolute left-0 top-[4px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              props.isMenuOpen ? 'top-[7px] rotate-45' : '',
            )}
          />
          <span
            className={cn(
              'absolute left-0 top-[11px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              props.isMenuOpen ? 'top-[7px] -rotate-45' : '',
            )}
          />
        </span>
      </button>
    </div>
  );
}

function HeaderDeferredSurfaces(props: IHeaderDeferredSurfacesProps) {
  return (
    <>
      {props.hasMobileSearchMounted ? (
        <MobileNavOverlay
          ariaLabel="Search PopBox Studio products"
          initialFocusId={MOBILE_SEARCH_INPUT_ID}
          isOpen={props.isSearchOpen}
          onClose={props.onMenuClose}
          restoreFocusId={MOBILE_SEARCH_BUTTON_ID}
        >
          <MobileSearchPanel
            autocompleteSuggestions={props.autocompleteSuggestions}
            isAutocompleteError={props.isAutocompleteError}
            isAutocompletePending={props.isAutocompletePending}
            onNavigate={props.onNavigate}
            onSearchQueryChange={props.onSearchQueryChange}
            onSearchSubmit={props.onSearchSubmit}
            onSuggestionSelect={props.onSuggestionSelect}
            searchInputId={MOBILE_SEARCH_INPUT_ID}
            searchQuery={props.searchQuery}
            setSearchQuery={props.setSearchQuery}
          />
        </MobileNavOverlay>
      ) : null}

      {props.hasMobileMenuMounted ? (
        <MobileNavOverlay
          ariaLabel="Store navigation menu"
          isOpen={props.isMenuOpen}
          onClose={props.onMenuClose}
          containerClassName="xl:hidden"
          panelClassName="bottom-0"
          restoreFocusId={MOBILE_MENU_BUTTON_ID}
        >
          <MobileMenuPanel
            collectionNavItems={props.collectionNavItems}
            isOpen={props.isMenuOpen}
            onNavigate={props.onMenuNavigate}
          />
        </MobileNavOverlay>
      ) : null}

      {props.hasWishlistDrawerMounted ? (
        <WishlistDrawer
          isOpen={props.isWishlistOpen}
          onClose={props.onWishlistClose}
          triggerButtonId={WISHLIST_BUTTON_ID}
        />
      ) : null}

      {props.hasCartDrawerMounted ? (
        <CartDrawer
          isOpen={props.isCartOpen}
          onClose={props.onCartClose}
          triggerButtonId={MOBILE_CART_BUTTON_ID}
        />
      ) : null}
    </>
  );
}

export function StoreHeaderClient(props: IStoreHeaderClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileNavbarVisible = useMobileNavbarVisibility();
  const cartItems = useCartStore((state) => state.items);
  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const wishlistItems = useWishlistStore((state) => state.items);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const checkoutSuccessCleanupSessionId = useCheckoutUiStore((state) => state.checkoutSuccessCleanupSessionId);

  const [activeMobilePanel, setActiveMobilePanel] = useState<TMobilePanel>(null);
  const [hasCartDrawerMounted, setHasCartDrawerMounted] = useState(false);
  const [hasMobileMenuMounted, setHasMobileMenuMounted] = useState(false);
  const [hasMobileSearchMounted, setHasMobileSearchMounted] = useState(false);
  const [hasWishlistDrawerMounted, setHasWishlistDrawerMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFlyTargetHeaderVisible, setIsFlyTargetHeaderVisible] = useState(false);
  const [hasStoreBanner, setHasStoreBanner] = useState(() => isVisibleStoreBanner(props.initialStoreBanner));
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const flyTargetHeaderRevealTimeoutRef = useRef<number | null>(null);

  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 220);
  const shouldFetchAutocomplete = activeMobilePanel === 'search' && debouncedSearchQuery.length >= 2;

  const { data: autocompleteResponse, isError: isAutocompleteError, isPending: isAutocompletePending } =
    useCustomizeQuery<IProductSuggestionResponse>({
      queryKey: ['search', 'autocomplete', debouncedSearchQuery],
      queryFn: () => QueryConfigs.fetchAutocomplete(debouncedSearchQuery),
      enabled: shouldFetchAutocomplete,
      gcTime: 5 * 60 * 1000,
      retry: false,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const totalItems = cartItems.reduce((accumulator, item) => accumulator + item.quantity, 0);
  const totalWishlistItems = wishlistItems.length;
  const isMenuOpen = activeMobilePanel === 'menu';
  const isSearchOpen = activeMobilePanel === 'search';
  const shouldShowMobileNavbar =
    activeMobilePanel !== null ||
    isCartOpen ||
    isWishlistOpen ||
    isFlyTargetHeaderVisible ||
    isMobileNavbarVisible;
  const autocompleteSuggestions = shouldFetchAutocomplete
    ? autocompleteResponse?.data?.data?.items ?? []
    : [];
  const activeTopLevelNavKey = getActiveTopLevelNavKey(pathname, searchParams);
  const checkoutSuccessSessionId = pathname === '/checkout/success' ? searchParams.get('session_id') : null;
  const shouldHideForCheckoutSuccessCleanup = Boolean(
    checkoutSuccessSessionId && checkoutSuccessCleanupSessionId !== checkoutSuccessSessionId,
  );
  const desktopNavItems = DESKTOP_PRIMARY_NAV_ITEMS.map((item) => ({
    key: item.key,
    href: item.href,
    label: item.label,
    isActive: activeTopLevelNavKey === item.key,
  }));
  const isCollectionsActive = activeTopLevelNavKey === 'collections';
  const collectionMenuItems = props.collectionNavItems.filter((item) => item.href !== FEATURED_NAV_HREF);

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const inputElement = document.getElementById(MOBILE_SEARCH_INPUT_ID);
      if (inputElement instanceof HTMLInputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    const handleFlyTargetRequest = () => {
      if (flyTargetHeaderRevealTimeoutRef.current !== null) {
        window.clearTimeout(flyTargetHeaderRevealTimeoutRef.current);
      }

      setIsFlyTargetHeaderVisible(true);
      flyTargetHeaderRevealTimeoutRef.current = window.setTimeout(() => {
        flyTargetHeaderRevealTimeoutRef.current = null;
        setIsFlyTargetHeaderVisible(false);
      }, FLY_TARGET_HEADER_REVEAL_MS);
    };

    window.addEventListener(FLY_TARGET_REQUEST_EVENT, handleFlyTargetRequest);

    return () => {
      window.removeEventListener(FLY_TARGET_REQUEST_EVENT, handleFlyTargetRequest);

      if (flyTargetHeaderRevealTimeoutRef.current !== null) {
        window.clearTimeout(flyTargetHeaderRevealTimeoutRef.current);
        flyTargetHeaderRevealTimeoutRef.current = null;
      }
    };
  }, [flyTargetHeaderRevealTimeoutRef]);

  const closeMobilePanel = () => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);
  };

  const navigateWithMobileClose = (href: string) => {
    setActiveMobilePanel(null);
    setSearchQuery('');
    router.push(href);
  };

  const handleMobilePanelToggle = (panel: Exclude<TMobilePanel, null>) => {
    const nextPanel = activeMobilePanel === panel ? null : panel;

    if (activeMobilePanel === 'search' && nextPanel !== 'search') {
      setSearchQuery('');
    }

    if (nextPanel === 'menu') {
      setHasMobileMenuMounted(true);
    }

    if (nextPanel === 'search') {
      setHasMobileSearchMounted(true);
    }

    setActiveMobilePanel(nextPanel);
  };

  const handleMobileMenuNavigate = () => {
    setActiveMobilePanel(null);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    navigateWithMobileClose(`/search/results?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSuggestionSelect = (suggestion: IProductSuggestion) => {
    navigateWithMobileClose(`/products/${suggestion.slug}`);
  };

  const handleCartOpen = () => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);
    setIsWishlistOpen(false);
    setHasCartDrawerMounted(true);
    setIsCartOpen(true);
  };

  const handleWishlistOpen = () => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);
    setIsCartOpen(false);
    setHasWishlistDrawerMounted(true);
    setIsWishlistOpen(true);
  };

  const handleBannerVisibilityChange = useCallback((isVisible: boolean) => {
    setHasStoreBanner(isVisible);
  }, []);

  if (shouldHideForCheckoutSuccessCleanup) {
    return null;
  }

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 bg-background transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          shouldShowMobileNavbar ? 'translate-y-0' : '-translate-y-full',
          'shadow-sm',
        )}
      >
        <StorefrontBanner
          initialBanner={props.initialStoreBanner}
          onVisibilityChange={handleBannerVisibilityChange}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-5 xl:gap-8">
              <Link
                href="/"
                aria-label="PopBox Studio"
                className="inline-flex h-10 min-w-0 shrink-0 items-center justify-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <BrandLogo variant="nav" />
                <span
                  aria-hidden="true"
                  className="hidden min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold tracking-tight text-primary sm:inline-block sm:text-lg"
                >
                  PopBox <span className="text-foreground">Studio</span>
                </span>
                <span className="sr-only">PopBox Studio</span>
              </Link>
              <nav className="hidden shrink-0 flex-nowrap items-center gap-2 xl:flex" aria-label="Primary">
                {desktopNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    className={getDesktopNavItemClassName(item.isActive)}
                  >
                    <span className={cn(item.isActive && 'font-semibold')}>{item.label}</span>
                  </Link>
                ))}
                {collectionMenuItems.length > 0 ? (
                  <DropdownMenu defaultTriggerId={COLLECTIONS_MENU_TRIGGER_ID}>
                    <DropdownMenuTrigger
                      id={COLLECTIONS_MENU_TRIGGER_ID}
                      aria-current={isCollectionsActive ? 'page' : undefined}
                      className={cn(
                        getDesktopNavItemClassName(isCollectionsActive, true),
                        'gap-1 bg-transparent hover:bg-transparent focus-visible:bg-transparent data-popup-open:bg-muted/55 data-open:bg-muted/55 data-open:focus-visible:bg-muted/55',
                      )}
                    >
                      <span className={cn(isCollectionsActive && 'font-semibold')}>All Collections</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[popup-open]:rotate-180 data-[open]:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={10}
                      className="max-h-[min(70vh,24rem)] w-64 overflow-y-auto rounded-2xl p-1.5"
                    >
                      {collectionMenuItems.map((item) => {
                        const isActive = isStoreNavItemActive(pathname, searchParams, item.href);

                        return (
                          <DropdownMenuItem
                            key={item.href}
                            className={cn(
                              'rounded-xl px-3 py-2.5 text-sm font-medium text-foreground',
                              isActive && 'bg-accent text-foreground',
                            )}
                            render={<Link href={item.href} aria-current={isActive ? 'page' : undefined} />}
                          >
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </nav>
            </div>

            <StoreHeaderActions
              hasCartHydrated={hasCartHydrated}
              hasWishlistHydrated={hasWishlistHydrated}
              isMenuOpen={isMenuOpen}
              isSearchOpen={isSearchOpen}
              onCartOpen={handleCartOpen}
              onMenuToggle={() => handleMobilePanelToggle('menu')}
              onSearchToggle={() => handleMobilePanelToggle('search')}
              onWishlistOpen={handleWishlistOpen}
              totalItems={totalItems}
              totalWishlistItems={totalWishlistItems}
            />
          </div>
        </div>
      </header>

      <div className={cn(hasStoreBanner ? 'h-25 sm:h-26' : 'h-16')} aria-hidden="true" />

      <HeaderDeferredSurfaces
        autocompleteSuggestions={autocompleteSuggestions}
        collectionNavItems={props.collectionNavItems}
        hasCartDrawerMounted={hasCartDrawerMounted}
        hasMobileMenuMounted={hasMobileMenuMounted}
        hasMobileSearchMounted={hasMobileSearchMounted}
        hasWishlistDrawerMounted={hasWishlistDrawerMounted}
        isAutocompleteError={isAutocompleteError}
        isAutocompletePending={isAutocompletePending}
        isCartOpen={isCartOpen}
        isMenuOpen={isMenuOpen}
        isSearchOpen={isSearchOpen}
        isWishlistOpen={isWishlistOpen}
        onCartClose={() => setIsCartOpen(false)}
        onMenuClose={closeMobilePanel}
        onMenuNavigate={handleMobileMenuNavigate}
        onNavigate={navigateWithMobileClose}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSuggestionSelect={handleSuggestionSelect}
        onWishlistClose={() => setIsWishlistOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </>
  );
}
