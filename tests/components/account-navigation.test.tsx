import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountNavigation, getAccountNavigationItem } from '@/components/account/account-navigation';

const navigationMock = vi.hoisted(() => ({ pathname: '/account', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({ push: navigationMock.push }),
}));

describe('account navigation labels', () => {
  beforeEach(() => {
    navigationMock.pathname = '/account';
  });

  it.each([
    ['/account', 'Profile'],
    ['/account/orders', 'Orders'],
    ['/account/orders/PBX-123', 'Orders'],
    ['/account/kuji', 'Kuji History'],
    ['/account/unknown', 'Profile'],
  ])('maps %s to %s', (pathname, label) => {
    expect(getAccountNavigationItem(pathname).label).toBe(label);
  });

  it('renders the selected label instead of the raw pathname', () => {
    navigationMock.pathname = '/account/orders/PBX-123';
    const { container } = render(<AccountNavigation />);
    const trigger = container.querySelector('[data-slot="select-trigger"]');

    expect(trigger).toHaveTextContent('Orders');
    expect(screen.queryByText('/account/orders/PBX-123')).not.toBeInTheDocument();
  });
});
