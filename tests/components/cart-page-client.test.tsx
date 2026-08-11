import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CartPageClient from '@/app/(store)/cart/page-client';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
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
  it('explains when migration removes every legacy standard item', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [],
        migrationNotice: {
          code: 'legacy_standard_variants_removed',
          removedCount: 2,
        },
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByText(/Some outdated standard items were removed/)).toBeInTheDocument();
    expect(screen.getByText('2 items removed.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

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

  it('shows each product collection as a separate badge', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [
          createCartItem({
            product: {
              collections: [
                {
                  id: 'collection-featured',
                  name: 'Featured',
                  slug: 'featured',
                },
                {
                  id: 'collection-limited',
                  name: 'Limited Run',
                  slug: 'limited-run',
                },
              ],
            },
          }),
        ],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Limited Run')).toBeInTheDocument();
    expect(screen.queryByText('Featured +1')).not.toBeInTheDocument();
  });

  it('shows generic regional shipping policy before an address is known', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14899 } })],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getAllByText('Calculated after details are provided').length).toBeGreaterThan(0);
    expect(await screen.findByText(/\$77\.00 in Calgary/)).toBeInTheDocument();
    expect(screen.getByText(/\$88\.00 in Alberta/)).toBeInTheDocument();
    expect(screen.getByText(/\$149\.00 across Canada/)).toBeInTheDocument();
    expect(screen.queryByText('$15.99')).not.toBeInTheDocument();
    expect(screen.queryByText(/Backend quote/i)).not.toBeInTheDocument();
  });

  it('uses a focused two-column checkout layout on desktop', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(screen.getByTestId('cart-checkout-layout')).toHaveClass(
      'mx-auto',
      'max-w-6xl',
      'lg:grid-cols-[minmax(0,40rem)_22rem]',
      'xl:grid-cols-[minmax(0,42rem)_23rem]',
    );
    expect(screen.getByTestId('cart-summary-column')).toHaveClass('lg:sticky', 'lg:top-24');
  });

  it('does not infer free shipping from a client cart subtotal', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14900 } })],
      });
    });

    renderWithProviders(<CartPageClient />);

    expect(await screen.findByText(/\$77\.00 in Calgary/)).toBeInTheDocument();
    expect(screen.queryByText(/^Free$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Free shipping unlocked/)).not.toBeInTheDocument();
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

  it('keeps cart controls inert while checkout handoff is pending', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
      useCheckoutUiStore.getState().beginCheckout();
    });

    const { container } = renderWithProviders(<CartPageClient />);
    const removeButton = container.querySelector('article button[class*="text-destructive"]');
    const lockedRegion = screen.getByTestId('cart-checkout-shell');
    const overlay = screen.getByRole('status', { name: /Preparing secure checkout/i });

    expect(overlay.parentElement).toBe(document.body);
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-[2147483647]', 'pointer-events-auto');
    expect(lockedRegion).toHaveAttribute('inert');
    expect(removeButton).toBeDisabled();
    expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await userEvent.click(removeButton as HTMLButtonElement);

    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
