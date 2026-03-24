'use client';

import { Suspense, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, Search, ShoppingBag } from 'lucide-react';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import { MobileNavOverlay } from '@/components/layout/mobile-nav-overlay';
import { MobileSearchPanel } from '@/components/layout/mobile-search-panel';
import { WishlistDrawer } from '@/components/wishlist/wishlist-drawer';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMobileNavbarVisibility } from '@/hooks/use-mobile-navbar-visibility';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProductSuggestion, IProductSuggestionResponse } from '@/interfaces/product';
import { cn, isActiveLink } from '@/lib/utils';

type TMobilePanel = 'menu' | 'search' | null;

const WISHLIST_BUTTON_ID = 'store-wishlist-trigger';
const MOBILE_CART_BUTTON_ID = 'store-mobile-cart-trigger';
const MOBILE_MENU_BUTTON_ID = 'store-mobile-menu-trigger';
const MOBILE_SEARCH_BUTTON_ID = 'store-mobile-search-trigger';
const MOBILE_SEARCH_INPUT_ID = 'store-mobile-search-input';

function isShopAllNavActive(pathname: string, typeParam: string | null) {
  return pathname === '/products' && typeParam !== 'kuji';
}

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

function StoreHeaderActions(props: IStoreHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        id={MOBILE_SEARCH_BUTTON_ID}
        type="button"
        aria-expanded={props.isSearchOpen}
        aria-label={props.isSearchOpen ? 'Close search' : 'Open search'}
        className={cn(
          'rounded-full border border-transparent p-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          props.isSearchOpen ? 'bg-primary/20 text-foreground shadow-sm' : 'bg-background/70',
        )}
        onClick={props.onSearchToggle}
      >
        <Search className="h-5 w-5" />
      </button>

      <button
        id={WISHLIST_BUTTON_ID}
        type="button"
        className="relative rounded-full border border-transparent bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={props.onWishlistOpen}
      >
        <span className="sr-only">Open wishlist</span>
        <Heart className="h-5 w-5" />
        {props.hasWishlistHydrated && props.totalWishlistItems > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {props.totalWishlistItems}
          </span>
        ) : null}
      </button>

      <button
        id={MOBILE_CART_BUTTON_ID}
        type="button"
        className="relative rounded-full border border-transparent bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={props.onCartOpen}
      >
        <span className="sr-only">Open cart</span>
        <ShoppingBag className="h-5 w-5" />
        {props.hasCartHydrated && props.totalItems > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {props.totalItems}
          </span>
        ) : null}
      </button>

      <button
        id={MOBILE_MENU_BUTTON_ID}
        type="button"
        aria-expanded={props.isMenuOpen}
        aria-label={props.isMenuOpen ? 'Close menu' : 'Open menu'}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-full border p-2 text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden',
          props.isMenuOpen ? 'border-primary/30 bg-primary/20 shadow-sm' : 'border-border/60 bg-background/80',
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

export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileNavbarVisible = useMobileNavbarVisibility();
  const cartItems = useCartStore((state) => state.items);
  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const wishlistItems = useWishlistStore((state) => state.items);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);

  const [activeMobilePanel, setActiveMobilePanel] = useState<TMobilePanel>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
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
  const isShopAllActive = isShopAllNavActive(pathname, searchParams.get('type'));
  const isKujiActive = isActiveLink('/products?type=kuji', pathname, searchParams);

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

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 bg-background transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          shouldShowMobileNavbar ? 'translate-y-0' : '-translate-y-full',
          activeMobilePanel !== null
            ? 'shadow-[0_24px_54px_-36px_hsl(var(--foreground)/0.48)]'
            : 'shadow-[0_18px_40px_-36px_hsl(var(--foreground)/0.42)]',
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-8">
              {/*TODO: logo*/}
              <Link href="/home" className="truncate font-bold tracking-tight text-primary text-lg sm:text-xl">
                PopBox Studio
              </Link>
              <nav className="hidden md:flex md:items-center md:space-x-3">
                {[
                  { href: '/products', isActive: isShopAllActive, label: 'Shop All' },
                  { href: '/products?type=kuji', isActive: isKujiActive, label: 'Ichiban Kuji' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    className={cn(
                      'group relative inline-flex items-center rounded-full px-3 py-2 text-sm font-medium tracking-tight transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]',
                      item.isActive
                        ? 'bg-primary/60 text-foreground shadow-[0_10px_24px_-20px_hsl(var(--foreground)/0.55)]'
                        : 'text-muted-foreground hover:-translate-y-px hover:bg-primary/60 hover:text-foreground',
                    )}
                  >
                    <span className={cn('relative z-10', item.isActive ? 'font-semibold' : '')}>
                      {item.label}
                    </span>
                    {/* TODO: usable for underline animation */}
                    {/*<span*/}
                    {/*  aria-hidden="true"*/}
                    {/*  className={cn(*/}
                    {/*    'absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-primary transition-all duration-300 ease-out',*/}
                    {/*    item.isActive*/}
                    {/*      ? 'scale-x-100 opacity-100'*/}
                    {/*      : 'scale-x-0 opacity-70 group-hover:scale-x-100',*/}
                    {/*  )}*/}
                    {/*/>*/}
                  </Link>
                ))}
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

      <div className="h-16" aria-hidden="true" />

      <MobileNavOverlay
        ariaLabel="Search PopBox Studio products"
        initialFocusId={MOBILE_SEARCH_INPUT_ID}
        isOpen={isSearchOpen}
        onClose={closeMobilePanel}
        containerClassName=""
        // panelClassName="px-0"
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
        containerClassName="md:hidden"
        // panelClassName="bottom-0 pb-8"
        restoreFocusId={MOBILE_MENU_BUTTON_ID}
      >
        <Suspense fallback={null}>
          <MobileMenuPanel isOpen={isMenuOpen} onNavigate={handleMobileMenuNavigate} />
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
