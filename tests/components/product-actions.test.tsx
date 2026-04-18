import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductActions } from '@/components/product/product-actions';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { createProductCard } from '../fixtures';
import { renderWithProviders, resetStores } from '../test-utils';

const originalNavigatorClipboard = navigator.clipboard;
const originalNavigatorShare = navigator.share;

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

function mockNavigatorClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: writeText
      ? {
        writeText,
      }
      : undefined,
  });
}

function mockNavigatorShare(share?: typeof navigator.share) {
  Object.defineProperty(window.navigator, 'share', {
    configurable: true,
    value: share,
  });
}

describe('ProductActions', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockNavigatorClipboard(originalNavigatorClipboard?.writeText?.bind(originalNavigatorClipboard));
    mockNavigatorShare(originalNavigatorShare);
    window.history.replaceState({}, '', '/');
  });

  it('renders share and wishlist secondary actions', () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    expect(screen.getByRole('button', { name: /share product/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Wishlist' })).toBeInTheDocument();
  });

  it('shows a success alert after adding a product to cart', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByRole('status')).toHaveTextContent('Added to cart');
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('shows success alerts when adding to and removing from wishlist', async () => {
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
    expect(screen.getByRole('status')).toHaveTextContent('Removed from wishlist');
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

  it('copies the current product URL when Web Share API is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    mockNavigatorShare(undefined);
    mockNavigatorClipboard(writeText);
    window.history.replaceState({}, '', '/products/shareable-product');

    renderWithProviders(<ProductActions product={createProduct()} />);

    await expect(userEvent.click(screen.getByRole('button', { name: /share product/i }))).resolves.toBeUndefined();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole('status')).toHaveTextContent('Product link copied');
  });

  it('shows a warning alert when share fallback fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'));

    mockNavigatorShare(undefined);
    mockNavigatorClipboard(writeText);
    window.history.replaceState({}, '', '/products/share-error');

    renderWithProviders(<ProductActions product={createProduct()} />);

    await expect(userEvent.click(screen.getByRole('button', { name: /share product/i }))).resolves.toBeUndefined();

    expect(screen.getByRole('status')).toHaveTextContent('Product not shared');
    expect(screen.getByRole('status')).toHaveTextContent('Please copy the URL from your browser.');
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
