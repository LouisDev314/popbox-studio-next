'use client';

import { Suspense, type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag } from 'lucide-react';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import { MobileNavOverlay } from '@/components/layout/mobile-nav-overlay';
import { MobileSearchPanel } from '@/components/layout/mobile-search-panel';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMobileNavbarVisibility } from '@/hooks/use-mobile-navbar-visibility';
import { type IProductSuggestion, IProductSuggestionResponse } from '@/interfaces/product';
import { cn } from '@/utils/helpers';
import Image from 'next/image';

type TMobilePanel = 'menu' | 'search' | null;

const MOBILE_CART_BUTTON_ID = 'store-mobile-cart-trigger';
const MOBILE_MENU_BUTTON_ID = 'store-mobile-menu-trigger';
const MOBILE_SEARCH_BUTTON_ID = 'store-mobile-search-trigger';
const MOBILE_SEARCH_INPUT_ID = 'store-mobile-search-input';

export function StoreHeader() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isMobileNavbarVisible = useMobileNavbarVisibility();
  const cartItems = useCartStore((state) => state.items);

  const [activeMobilePanel, setActiveMobilePanel] = useState<TMobilePanel>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
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
  const isMenuOpen = activeMobilePanel === 'menu';
  const isSearchOpen = activeMobilePanel === 'search';
  const shouldShowMobileNavbar = activeMobilePanel !== null || isCartOpen || isMobileNavbarVisible;
  const autocompleteSuggestions = shouldFetchAutocomplete
    ? autocompleteResponse?.data?.data?.items ?? []
    : [];

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
    setIsCartOpen(true);
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] supports-[backdrop-filter]:bg-background/75',
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
              <nav className="hidden md:flex md:items-center md:space-x-8">
                <Link href="/products" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
                  Shop All
                </Link>
                <Link href="/products?type=kuji" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
                  Ichiban Kuji
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                id={MOBILE_SEARCH_BUTTON_ID}
                type="button"
                aria-expanded={isSearchOpen}
                aria-label={isSearchOpen ? 'Close search' : 'Open search'}
                className={cn(
                  'rounded-full border border-transparent p-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSearchOpen ? 'bg-primary/20 text-foreground shadow-sm' : 'bg-background/70',
                )}
                onClick={() => handleMobilePanelToggle('search')}
              >
                <Search className="h-5 w-5" />
              </button>

              <button
                id={MOBILE_CART_BUTTON_ID}
                type="button"
                className="relative rounded-full border border-transparent bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={handleCartOpen}
              >
                <span className="sr-only">Open cart</span>
                <ShoppingBag className="h-5 w-5" />
                {isClient && totalItems > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                id={MOBILE_MENU_BUTTON_ID}
                type="button"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                className={cn(
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-full border p-2 text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden',
                  isMenuOpen ? 'border-primary/30 bg-primary/20 shadow-sm' : 'border-border/60 bg-background/80',
                )}
                onClick={() => handleMobilePanelToggle('menu')}
              >
                <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
                <span className="relative block h-4 w-5">
                  <span
                    className={cn(
                      'absolute left-0 top-[4px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      isMenuOpen ? 'top-[7px] rotate-45' : '',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute left-0 top-[11px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      isMenuOpen ? 'top-[7px] -rotate-45' : '',
                    )}
                  />
                </span>
              </button>
            </div>
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

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} triggerButtonId={MOBILE_CART_BUTTON_ID} />
    </>
  );
}
