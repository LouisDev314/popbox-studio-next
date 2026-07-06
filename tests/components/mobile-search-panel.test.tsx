import type { ComponentProps } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileSearchPanel } from '@/components/layout/mobile-search-panel';
import { renderWithProviders } from '../test-utils';

function renderMobileSearchPanel(overrides: Partial<ComponentProps<typeof MobileSearchPanel>> = {}) {
  const props: ComponentProps<typeof MobileSearchPanel> = {
    autocompleteSuggestions: [],
    isAutocompleteError: false,
    isAutocompletePending: false,
    onNavigate: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onSearchSubmit: vi.fn((event) => event.preventDefault()),
    onSuggestionSelect: vi.fn(),
    searchInputId: 'mobile-search',
    searchQuery: '',
    setSearchQuery: vi.fn(),
    ...overrides,
  };

  renderWithProviders(<MobileSearchPanel {...props} />);

  return props;
}

describe('MobileSearchPanel', () => {
  it('renders quick picks as simple clickable rows without descriptions', () => {
    const props = renderMobileSearchPanel();

    const shopAllButton = screen.getByRole('button', { name: 'Shop all products' });
    const onePieceButton = screen.getByRole('button', { name: 'One Piece' });

    expect(screen.getByRole('button', { name: 'Ichiban Kuji' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dragon Ball' })).toBeInTheDocument();
    expect(screen.queryByText('Every active collectible in one place.')).not.toBeInTheDocument();
    expect(screen.queryByText('Top-hit anime with popular figures and merch.')).not.toBeInTheDocument();

    fireEvent.click(shopAllButton);
    fireEvent.click(onePieceButton);

    expect(props.onNavigate).toHaveBeenNthCalledWith(1, '/products');
    expect(props.onNavigate).toHaveBeenNthCalledWith(2, '/search/results?q=One%20Piece');
  });
});
