import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductActions } from '@/components/product/product-actions';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { createProductCard } from '../fixtures';
import { renderWithProviders, resetStores } from '../test-utils';

function createProduct(overrides: Partial<IProduct> = {}): IProduct {
  const productCard = createProductCard(overrides);

  return {
    ...productCard,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    kujiPrizes: overrides.kujiPrizes ?? [],
    sku: overrides.sku ?? 'SKU-001',
    tags: overrides.tags ?? [],
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('ProductActions', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a success alert after adding a product to cart', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByRole('status')).toHaveTextContent('Added to cart');
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('shows a success alert only when adding to wishlist', async () => {
    vi.useFakeTimers();

    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Wishlist' }));

    expect(screen.getByRole('status')).toHaveTextContent('Added to wishlist');
    expect(useWishlistStore.getState().items).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    expect(screen.queryByText('Added to wishlist')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove from Wishlist' }));

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.queryByText('Added to wishlist')).not.toBeInTheDocument();
  });

  it('auto-dismisses the success alert after the configured duration', async () => {
    vi.useFakeTimers();

    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByText('Added to cart')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    expect(screen.queryByText('Added to cart')).not.toBeInTheDocument();
  });

  it('keeps a single alert instance and resets the timer on repeated success actions', async () => {
    vi.useFakeTimers();

    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    act(() => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getAllByText('Added to cart')).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(screen.getByText('Added to cart')).toBeInTheDocument();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.queryByText('Added to cart')).not.toBeInTheDocument();
  });

  it('disables the action buttons during their guarded interaction window', async () => {
    vi.useFakeTimers();

    renderWithProviders(<ProductActions product={createProduct()} />);

    const cartButton = screen.getByRole('button', { name: 'Add to Cart' });
    const wishlistButton = screen.getByRole('button', { name: 'Add to Wishlist' });

    fireEvent.click(cartButton);

    expect(cartButton).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(cartButton).not.toBeDisabled();

    fireEvent.click(wishlistButton);

    expect(screen.getByRole('button', { name: 'Remove from Wishlist' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole('button', { name: 'Remove from Wishlist' })).not.toBeDisabled();
  });

  it('preserves inline cart validation messaging for unsuccessful adds', async () => {
    renderWithProviders(
      <ProductActions product={createProduct({ id: 'legacy-figure' })} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByText('This cart item uses an outdated product reference and must be removed before checkout.')).toBeInTheDocument();
    expect(screen.queryByText('Added to cart')).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
