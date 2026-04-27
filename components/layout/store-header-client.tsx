'use client';

import { Suspense, type FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Heart, Search, ShoppingBag } from 'lucide-react';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import { MobileNavOverlay } from '@/components/layout/mobile-nav-overlay';
import { MobileSearchPanel } from '@/components/layout/mobile-search-panel';
import { StorefrontBanner } from '@/components/layout/store-banner';
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
import { WishlistDrawer } from '@/components/wishlist/wishlist-drawer';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMobileNavbarVisibility } from '@/hooks/use-mobile-navbar-visibility';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProductSuggestion, IProductSuggestionResponse } from '@/interfaces/product';
import { formatQuantity } from '@/lib/format-quantity';
import { cn } from '@/lib/utils';

type TMobilePanel = 'menu' | 'search' | null;

const WISHLIST_BUTTON_ID = 'store-wishlist-trigger';
const MOBILE_CART_BUTTON_ID = 'store-mobile-cart-trigger';
const MOBILE_MENU_BUTTON_ID = 'store-mobile-menu-trigger';
const MOBILE_SEARCH_BUTTON_ID = 'store-mobile-search-trigger';
const MOBILE_SEARCH_INPUT_ID = 'store-mobile-search-input';

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
    <div className="flex items-center gap-2">
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
          'relative inline-flex h-10 w-10 items-center justify-center rounded-full border p-2 text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden',
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasStoreBanner, setHasStoreBanner] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  const shouldShowMobileNavbar = activeMobilePanel !== null || isCartOpen || isWishlistOpen || isMobileNavbarVisible;
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
    setIsCartOpen(true);
  };

  const handleWishlistOpen = () => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);
    setIsCartOpen(false);
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
        <StorefrontBanner onVisibilityChange={handleBannerVisibilityChange} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-8">
              <Link href="/" className="truncate font-bold tracking-tight text-primary text-lg sm:text-xl">
                PopBox Studio
              </Link>
              <nav className="hidden lg:flex lg:items-center lg:gap-2" aria-label="Primary">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger
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

      <div className={cn(hasStoreBanner ? 'h-[6.5rem]' : 'h-16')} aria-hidden="true" />

      <MobileNavOverlay
        ariaLabel="Search PopBox Studio products"
        initialFocusId={MOBILE_SEARCH_INPUT_ID}
        isOpen={isSearchOpen}
        onClose={closeMobilePanel}
        containerClassName=""
        restoreFocusId={MOBILE_SEARCH_BUTTON_ID}
      >
        <MobileSearchPanel
          autocompleteSuggestions={autocompleteSuggestions}
          isAutocompleteError={isAutocompleteError}
          isAutocompletePending={isAutocompletePending}
          onNavigate={navigateWithMobileClose}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSuggestionSelect={handleSuggestionSelect}
          searchInputId={MOBILE_SEARCH_INPUT_ID}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </MobileNavOverlay>

      <MobileNavOverlay
        ariaLabel="Store navigation menu"
        isOpen={isMenuOpen}
        onClose={closeMobilePanel}
        containerClassName="lg:hidden"
        panelClassName="bottom-0"
        restoreFocusId={MOBILE_MENU_BUTTON_ID}
      >
        <Suspense fallback={null}>
          <MobileMenuPanel
            collectionNavItems={props.collectionNavItems}
            isOpen={isMenuOpen}
            onNavigate={handleMobileMenuNavigate}
          />
        </Suspense>
      </MobileNavOverlay>

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        triggerButtonId={WISHLIST_BUTTON_ID}
      />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} triggerButtonId={MOBILE_CART_BUTTON_ID} />
    </>
  );
}
