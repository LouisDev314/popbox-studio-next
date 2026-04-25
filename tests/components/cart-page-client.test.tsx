import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CartPageClient from '@/app/(store)/cart/page-client';
import { useCartStore } from '@/hooks/use-cart';
import { createCartItem } from '../fixtures';
import { renderWithProviders, resetStores } from '../test-utils';

vi.mock('@/components/cart/checkout-button', () => ({
  CheckoutButton: ({ className, label = 'Check Out' }: { className?: string; label?: string }) => (
    <button type="button" className={className}>
      {label}
    </button>
  ),
}));

describe('CartPageClient', () => {
  it('shows a shipping and returns reminder for standard carts', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
    expect(screen.queryByText(/Kuji items are random draw and final sale/i)).not.toBeInTheDocument();
  });

  it('shows flat shipping and the amount away from free shipping below the threshold', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14899 } })],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('You are $0.01 away from free shipping.')).toBeInTheDocument();
  });

  it('shows free shipping at the threshold', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14900 } })],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('You qualify for free shipping.')).toBeInTheDocument();
  });

  it('shows a kuji-specific reminder when the cart contains kuji items', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { productType: 'kuji' } })],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByText(/Kuji items are random draw and final sale/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
  });

  it('removes a cart item without showing a success alert', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    const { container } = renderWithProviders(<CartPageClient />);
    const removeButton = container.querySelector('article button[class*="text-destructive"]');

    expect(removeButton).not.toBeNull();

    await userEvent.click(removeButton as HTMLButtonElement);

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
