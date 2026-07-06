import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import type { IStoreCollectionNavItem } from '@/components/layout/store-navigation';
import { renderWithProviders } from '../test-utils';

const navigationMock = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useSearchParams: () => navigationMock.searchParams,
}));

const collectionNavItems: IStoreCollectionNavItem[] = [
  {
    description: 'Featured collection',
    href: '/collections/featured',
    label: 'Featured',
  },
  {
    description: 'New releases collection',
    href: '/collections/new-releases',
    label: 'New Releases',
  },
];

describe('MobileMenuPanel', () => {
  beforeEach(() => {
    navigationMock.pathname = '/';
    navigationMock.searchParams = new URLSearchParams();
  });

  it('renders quick options as simple clickable rows without descriptions', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(
      <MobileMenuPanel
        collectionNavItems={collectionNavItems}
        isOpen={true}
        onNavigate={onNavigate}
      />,
    );

    const showAllLink = screen.getByRole('link', { name: 'Show All' });
    expect(showAllLink).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Featured' })).toHaveAttribute('href', '/collections/featured');
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/products?sort=trending');
    expect(screen.getByRole('link', { name: 'Ichiban Kuji' })).toHaveAttribute('href', '/products?type=kuji');
    expect(screen.getByRole('link', { name: 'Anime Merchandise' })).toHaveAttribute('href', '/products?type=standard');

    expect(screen.queryByText('Browse every figure, collectible, and PopBox Studio release.')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium lottery-style prizes and ticket-based launches.')).not.toBeInTheDocument();

    showAllLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(showAllLink);

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
