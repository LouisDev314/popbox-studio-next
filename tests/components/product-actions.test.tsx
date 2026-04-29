import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductActions } from '@/components/product/product-actions';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { createProductCard } from '../fixtures';
import { renderWithProviders, resetStores } from '../test-utils';

const lottieCompleteListeners = vi.hoisted(() => new Set<() => void>());
const originalNavigatorClipboard = navigator.clipboard;
const originalNavigatorShare = navigator.share;

vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: ({
    dotLottieRefCallback,
    src,
  }: {
    dotLottieRefCallback?: (player: {
      addEventListener: (event: string, listener: () => void) => void;
      removeEventListener: (event: string, listener: () => void) => void;
    } | null) => void;
    src: string;
  }) => {
    dotLottieRefCallback?.({
      addEventListener: (event, listener) => {
        if (event === 'complete') {
          lottieCompleteListeners.add(listener);
        }
      },
      removeEventListener: (event, listener) => {
        if (event === 'complete') {
          lottieCompleteListeners.delete(listener);
        }
      },
    });

    return <span data-testid="product-action-lottie" data-src={src} />;
  },
}));

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

function completeLottieAnimations() {
  act(() => {
    for (const listener of Array.from(lottieCompleteListeners)) {
      listener();
    }
  });
}

describe('ProductActions', () => {
  beforeEach(() => {
    resetStores();
    lottieCompleteListeners.clear();
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
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
    expect(screen.queryByText('Random draw item. All sales final.')).not.toBeInTheDocument();
  });

  it('renders compact kuji helper copy with legal links', () => {
    renderWithProviders(<ProductActions product={createProduct({ productType: 'kuji' })} />);

    expect(screen.getByText(/Random draw item\. All sales final\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
  });

  it('shows inline success feedback after adding a product to cart', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    await screen.findByTestId('product-action-lottie');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(1);

    completeLottieAnimations();

    expect(screen.getByRole('button', { name: 'Add to Cart' })).not.toBeDisabled();
  });

  it('shows inline success feedback when adding to and removing from wishlist', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Wishlist' }));

    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    await screen.findByTestId('product-action-lottie');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useWishlistStore.getState().items).toHaveLength(1);

    completeLottieAnimations();

    expect(screen.getByRole('button', { name: 'Remove from Wishlist' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove from Wishlist' }));

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Removed' })).toBeDisabled();
    await screen.findByTestId('product-action-lottie');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clears inline cart success feedback after the configured duration', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByRole('button', { name: 'Added' })).toBeInTheDocument();
    await screen.findByTestId('product-action-lottie');

    completeLottieAnimations();

    expect(screen.queryByRole('button', { name: 'Added' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
  });

  it('prevents repeat cart actions while inline feedback is active', async () => {
    renderWithProviders(<ProductActions product={createProduct()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Added' }));
    await screen.findByTestId('product-action-lottie');

    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    completeLottieAnimations();

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
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
    renderWithProviders(<ProductActions product={createProduct()} />);

    const cartButton = screen.getByRole('button', { name: 'Add to Cart' });
    const wishlistButton = screen.getByRole('button', { name: 'Add to Wishlist' });

    fireEvent.click(cartButton);

    expect(cartButton).toBeDisabled();
    expect(wishlistButton).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).not.toBeDisabled();
    await screen.findByTestId('product-action-lottie');

    completeLottieAnimations();

    expect(cartButton).not.toBeDisabled();

    fireEvent.click(wishlistButton);

    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add to Cart' })).not.toBeDisabled();
    await screen.findByTestId('product-action-lottie');

    completeLottieAnimations();

    expect(screen.getByRole('button', { name: 'Remove from Wishlist' })).not.toBeDisabled();
  });

  it('preserves inline cart validation messaging for unsuccessful adds', async () => {
    renderWithProviders(
      <ProductActions product={createProduct({ id: 'legacy-figure' })} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(screen.getByText('This cart item uses an outdated product reference and must be removed before checkout.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Added' })).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
