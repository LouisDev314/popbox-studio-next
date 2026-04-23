import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CartPage from '@/app/(store)/cart/page';
import { useCartStore } from '@/hooks/use-cart';
import { createCartItem } from '../fixtures';
import { renderWithProviders } from '../test-utils';

describe('cart and checkout hydration gating', () => {
  it('keeps the cart page out of the empty state until cart persistence hydrates', () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: false,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartPage />);

    expect(screen.queryByText('Your cart is empty')).not.toBeInTheDocument();

    act(() => {
      useCartStore.setState({ hasHydrated: true });
    });

    expect(screen.getAllByRole('button', { name: 'Check Out' })).toHaveLength(2);
  });
});
