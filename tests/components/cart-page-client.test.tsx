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
