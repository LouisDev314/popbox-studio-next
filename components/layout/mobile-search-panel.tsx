'use client';

import { type FormEvent } from 'react';
import { ArrowUpRight, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type IProductSuggestion } from '@/interfaces/product';
import { formatPrice } from '@/utils/helpers';

interface IMobileSearchQuickLink {
  description: string;
  href?: string;
  label: string;
  query?: string;
}

interface IMobileSearchPanelProps {
  autocompleteSuggestions: IProductSuggestion[];
  isAutocompleteError: boolean;
  isAutocompletePending: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestionSelect: (suggestion: IProductSuggestion) => void;
  searchInputId: string;
  searchQuery: string;
}

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

export function MobileSearchPanel(props: IMobileSearchPanelProps) {
  const autocompleteSuggestions = props.autocompleteSuggestions;
  const isAutocompleteError = props.isAutocompleteError;
  const isAutocompletePending = props.isAutocompletePending;
  const onClose = props.onClose;
  const onNavigate = props.onNavigate;
  const onSearchQueryChange = props.onSearchQueryChange;
  const onSearchSubmit = props.onSearchSubmit;
  const onSuggestionSelect = props.onSuggestionSelect;
  const searchInputId = props.searchInputId;
  const searchQuery = props.searchQuery;
  const trimmedQuery = searchQuery.trim();

  const handleQuickLinkSelect = (quickLink: IMobileSearchQuickLink) => {
    if (quickLink.href) {
      onNavigate(quickLink.href);
      return;
    }

    if (quickLink.query) {
      onNavigate(`/search/results?q=${encodeURIComponent(quickLink.query)}`);
    }
  };

  return (
    <div className="overflow-hidden rounded-none border-x-0 border-t-0 border border-border/70 bg-background md:bg-background/90 md:backdrop-blur-2xl shadow-[0_32px_70px_-38px_hsl(var(--foreground)/0.55)]">
      <div className="container mx-auto max-w-4xl">
        <div className="border-b border-border/60 px-4 py-4 md:py-6 md:px-8">
          <div className="flex items-center gap-3">
            <form className="min-w-0 flex-1" onSubmit={onSearchSubmit}>
              <div className="flex items-center rounded-[22px] border border-border/70 bg-muted/50 px-3 shadow-inner">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  id={searchInputId}
                  autoComplete="off"
                  autoCorrect="off"
                  enterKeyHint="search"
                  placeholder="Search figures, kuji, or series..."
                  value={searchQuery}
                  className="h-12 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                Search
                </button>
              </div>
            </form>
            <button
              type="button"
              className="rounded-full border border-border/70 bg-background p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close search</span>
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-4 py-4 md:px-8 md:py-8">
          {!trimmedQuery ? (
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
                    className="group flex items-center justify-between rounded-[24px] border border-border/70 bg-gradient-to-br from-background to-muted/55 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                {isAutocompletePending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
              </div>

              {autocompleteSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {autocompleteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[22px] border border-border/70 bg-background px-3 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => onSuggestionSelect(suggestion)}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted/40">
                        <StorefrontImage
                          src={suggestion.thumbnailUrl}
                          alt={suggestion.name}
                          label={suggestion.name}
                          fallbackClassName="px-2 py-1 text-[10px]"
                        />
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
              ) : null}

              {!isAutocompletePending && autocompleteSuggestions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-4 py-5">
                  <p className="text-sm font-medium text-foreground">
                    {isAutocompleteError ? 'Autocomplete is unavailable right now.' : 'No instant matches yet.'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                  Continue with a full search to see matching storefront results for &quot;{trimmedQuery}&quot;.
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[24px] border border-primary/30 bg-primary/10 px-4 py-4 text-left transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => onNavigate(`/search/results?q=${encodeURIComponent(trimmedQuery)}`)}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Search all results</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                  View the complete results page for &quot;{trimmedQuery}&quot;.
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
