import type { AnchorHTMLAttributes } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

const usePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('AdminSidebar', () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it('renders grouped admin navigation with a store return link', () => {
    usePathname.mockReturnValue('/admin/products');

    render(<AdminSidebar />);

    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PopBox Studio' })).toHaveAttribute('href', '/admin/products');
    expect(screen.getByAltText('PopBox Studio')).toHaveAttribute('src', expect.stringContaining('store-logo.png'));
    expect(screen.getByRole('link', { name: /Shipping/i })).toHaveAttribute('href', '/admin/settings/shipping');
    expect(screen.getByRole('link', { name: /Store Banner/i })).toHaveAttribute('href', '/admin/settings/store-banner');
    expect(screen.getByRole('link', { name: /Back to store/i })).toHaveAttribute('href', '/');
  });

  it('marks the matching section as active for nested admin routes', () => {
    usePathname.mockReturnValue('/admin/orders/order-123');

    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: /Orders/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Products/i })).not.toHaveAttribute('aria-current');
  });

  it('marks settings routes as active for shipping settings', () => {
    usePathname.mockReturnValue('/admin/settings/shipping');

    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: /Shipping/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Store Banner/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Products/i })).not.toHaveAttribute('aria-current');
  });

  it('marks only the store banner settings route as active', () => {
    usePathname.mockReturnValue('/admin/settings/store-banner');

    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: /Store Banner/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Shipping/i })).not.toHaveAttribute('aria-current');
  });
});
