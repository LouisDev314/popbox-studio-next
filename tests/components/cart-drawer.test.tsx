/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { useCartStore } from '@/hooks/use-cart';
import { createCartItem } from '../fixtures';
import { renderWithProviders } from '../test-utils';

const push = vi.fn();

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock('@/components/cart/checkout-button', () => ({
  CheckoutButton: ({ className, label = 'Check Out' }: { className?: string; label?: string }) => (
    <button type="button" className={className}>
      {label}
    </button>
  ),
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('renders a continue shopping button in the empty state', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [],
      });
    });

    const onClose = vi.fn();
    renderWithProviders(<CartDrawer isOpen={true} onClose={onClose} triggerButtonId="cart-trigger" />);

    const continueShoppingButton = screen.getByRole('button', { name: 'Continue Shopping' });

    await userEvent.click(continueShoppingButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/products');
  });

  it('renders a continue shopping button in the footer when the cart has items', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    const onClose = vi.fn();
    renderWithProviders(<CartDrawer isOpen={true} onClose={onClose} triggerButtonId="cart-trigger" />);

    const continueShoppingButton = screen.getByRole('button', { name: 'Continue Shopping' });

    await userEvent.click(continueShoppingButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/products');
  });
});
