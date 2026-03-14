'use client';

import { type CSSProperties, type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronRight, Loader2, Search, ShoppingBag, X } from 'lucide-react';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileNavOverlay } from '@/components/layout/mobile-nav-overlay';
import { Input } from '@/components/ui/input';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMobileNavbarVisibility } from '@/hooks/use-mobile-navbar-visibility';
import { type IProductSuggestion } from '@/interfaces/product';
import { cn, formatPrice } from '@/utils/helpers';

type TMobilePanel = 'menu' | 'search' | null;

interface IMobileMenuItem {
  description: string;
  href: string;
  label: string;
}

interface IMobileSearchQuickLink {
  description: string;
  href?: string;
  label: string;
  query?: string;
}

const MOBILE_MENU_ITEMS: IMobileMenuItem[] = [
  {
    label: 'Home',
    href: '/',
    description: 'Featured drops, recent releases, and storefront highlights.',
  },
  {
    label: 'Shop All',
    href: '/products',
    description: 'Browse every figure, collectible, and PopBox Studio release.',
  },
  {
    label: 'Ichiban Kuji',
    href: '/products?type=kuji',
    description: 'Premium lottery-style prizes and ticket-based launches.',
  },
];

const MOBILE_SEARCH_QUICK_LINKS: IMobileSearchQuickLink[] = [
  {
    label: 'Shop all products',
    href: '/products',
    description: 'Every active collectible in one place.',
  },
  {
    label: 'Ichiban Kuji',
    href: '/products?type=kuji',
    description: 'Ticket drops, prize lines, and limited runs.',
  },
  {
    label: 'One Piece',
    query: 'One Piece',
    description: 'Popular figures, prizes, and character lines.',
  },
  {
    label: 'Dragon Ball',
    query: 'Dragon Ball',
    description: 'Fast access to a high-interest collector search.',
  },
];

export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isMobileNavbarVisible = useMobileNavbarVisibility();
  const cartItems = useCartStore((state) => state.items);

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [activeMobilePanel, setActiveMobilePanel] = useState<TMobilePanel>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 220);
  const shouldFetchAutocomplete = activeMobilePanel === 'search' && debouncedSearchQuery.length >= 2;

  const { data: autocompleteResponse, isError: isAutocompleteError, isPending: isAutocompletePending } =
    useCustomizeQuery<IProductSuggestion[]>({
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
  const shouldShowMobileNavbar = activeMobilePanel !== null || isMobileNavbarVisible;
  const autocompleteSuggestions = shouldFetchAutocomplete ? autocompleteResponse?.data?.data ?? [] : [];

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen]);

  const focusTriggerButton = (panel: Exclude<TMobilePanel, null>) => {
    window.requestAnimationFrame(() => {
      if (panel === 'menu') {
        menuButtonRef.current?.focus();
        return;
      }

      searchButtonRef.current?.focus();
    });
  };

  const closeMobilePanel = (panelToFocus?: Exclude<TMobilePanel, null>) => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);

    if (panelToFocus) {
      focusTriggerButton(panelToFocus);
    }
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

  const handleQuickLinkSelect = (quickLink: IMobileSearchQuickLink) => {
    if (quickLink.href) {
      navigateWithMobileClose(quickLink.href);
      return;
    }

    if (quickLink.query) {
      navigateWithMobileClose(`/search/results?q=${encodeURIComponent(quickLink.query)}`);
    }
  };

  const handleCartOpen = () => {
    if (activeMobilePanel === 'search') {
      setSearchQuery('');
    }

    setActiveMobilePanel(null);
    setIsCartOpen(true);
  };

  const isMenuItemActive = (href: string) => {
    if (href.includes('?')) {
      return false;
    }

    const pathnameOnlyHref = href.split('?')[0];
    return pathname === pathnameOnlyHref;
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:sticky md:top-0 md:translate-y-0 md:bg-background/95 supports-[backdrop-filter]:bg-background/75 md:supports-[backdrop-filter]:bg-background/60',
          shouldShowMobileNavbar ? 'translate-y-0' : '-translate-y-full',
          activeMobilePanel !== null
            ? 'shadow-[0_24px_54px_-36px_hsl(var(--foreground)/0.48)]'
            : 'shadow-[0_18px_40px_-36px_hsl(var(--foreground)/0.42)]',
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" className="truncate font-bold tracking-tight text-primary text-lg sm:text-xl">
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
                ref={searchButtonRef}
                type="button"
                aria-expanded={isSearchOpen}
                aria-label={isSearchOpen ? 'Close search' : 'Open search'}
                className={cn(
                  'rounded-full border border-transparent p-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden',
                  isSearchOpen ? 'bg-primary/20 text-foreground shadow-sm' : 'bg-background/70',
                )}
                onClick={() => handleMobilePanelToggle('search')}
              >
                <Search className="h-5 w-5" />
              </button>

              <Link
                href="/search"
                className="hidden rounded-full border border-transparent bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex"
              >
                <span className="sr-only">Search</span>
                <Search className="h-5 w-5" />
              </Link>

              <button
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
                ref={menuButtonRef}
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

      <div className="h-16 md:hidden" aria-hidden="true" />

      <MobileNavOverlay
        ariaLabel="Search PopBox Studio products"
        isOpen={isSearchOpen}
        onClose={() => closeMobilePanel('search')}
        panelClassName="px-3"
      >
        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/95 shadow-[0_32px_70px_-38px_hsl(var(--foreground)/0.55)]">
          <div className="border-b border-border/60 px-4 py-4">
            <div className="flex items-center gap-3">
              <form className="min-w-0 flex-1" onSubmit={handleSearchSubmit}>
                <div className="flex items-center rounded-[22px] border border-border/70 bg-muted/50 px-3 shadow-inner">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    autoComplete="off"
                    autoCorrect="off"
                    enterKeyHint="search"
                    placeholder="Search figures, kuji, or series..."
                    value={searchQuery}
                    className="h-12 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Search
                  </button>
                </div>
              </form>
              <button
                type="button"
                className="rounded-full border border-border/70 bg-background p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => closeMobilePanel('search')}
              >
                <span className="sr-only">Close search</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-4 py-4">
            {!searchQuery.trim() ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Quick picks
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Jump into curated storefront paths or start with a collector-favorite series.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {MOBILE_SEARCH_QUICK_LINKS.map((quickLink) => (
                    <button
                      key={quickLink.label}
                      type="button"
                      className="group flex items-center justify-between rounded-[24px] border border-border/70 bg-gradient-to-br from-background to-muted/55 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.45)]"
                      onClick={() => handleQuickLinkSelect(quickLink)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{quickLink.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{quickLink.description}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Suggestions
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Autocomplete is powered by the current storefront API contract.
                    </p>
                  </div>
                  {isAutocompletePending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                {autocompleteSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {autocompleteSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[22px] border border-border/70 bg-background px-3 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-muted/35"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
                          {suggestion.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={suggestion.thumbnailUrl}
                              alt={suggestion.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              PopBox
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{suggestion.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatPrice(suggestion.priceCents, suggestion.currency)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {!isAutocompletePending && autocompleteSuggestions.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-4 py-5">
                    <p className="text-sm font-medium text-foreground">
                      {isAutocompleteError ? 'Autocomplete is unavailable right now.' : 'No instant matches yet.'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Continue with a full search to see matching storefront results for &quot;{searchQuery.trim()}&quot;.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[24px] border border-primary/30 bg-primary/10 px-4 py-4 text-left transition-colors hover:bg-primary/15"
                  onClick={() => navigateWithMobileClose(`/search/results?q=${encodeURIComponent(searchQuery.trim())}`)}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">Search all results</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      View the complete results page for &quot;{searchQuery.trim()}&quot;.
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </MobileNavOverlay>

      <MobileNavOverlay
        ariaLabel="Store navigation menu"
        isOpen={isMenuOpen}
        onClose={() => closeMobilePanel('menu')}
        panelClassName="bottom-0 px-3 pb-4"
      >
        <div className="flex min-h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-[32px] border border-border/70 bg-background/95 shadow-[0_32px_72px_-40px_hsl(var(--foreground)/0.58)]">
          <div className="border-b border-border/60 px-5 pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Mobile navigation
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Shop PopBox Studio with less friction.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fast access to the storefront essentials, tuned for one-handed browsing.
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {MOBILE_MENU_ITEMS.map((item, index) => {
                const isActive = isMenuItemActive(item.href);
                const itemStyle: CSSProperties = {
                  transitionDelay: isMenuOpen ? `${index * 55}ms` : '0ms',
                };

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={itemStyle}
                    className={cn(
                      'group flex items-center justify-between rounded-[26px] border px-4 py-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
                      isActive
                        ? 'border-primary/40 bg-primary/12 shadow-[0_18px_38px_-30px_hsl(var(--foreground)/0.45)]'
                        : 'border-border/70 bg-gradient-to-br from-background to-muted/45 hover:-translate-y-0.5 hover:border-primary/30',
                    )}
                    onClick={() => setActiveMobilePanel(null)}
                  >
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border/60 px-5 py-4">
            <div className="rounded-[24px] bg-muted/35 px-4 py-4">
              <p className="text-sm font-semibold text-foreground">Collector-first storefront</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Premium product discovery, secure checkout, and focused navigation without adding backend complexity.
              </p>
            </div>
          </div>
        </div>
      </MobileNavOverlay>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
