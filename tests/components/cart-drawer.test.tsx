/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes, useState } from 'react';
import {
  act,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { useCartStore } from '@/hooks/use-cart';
import { createCartItem } from '../fixtures';
import {
  renderWithProviders,
  resetStores,
} from '../test-utils';

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

interface ICartDrawerHarnessProps {
  onClose?: () => void;
}

function CartDrawerHarness(props: ICartDrawerHarnessProps) {
  const { onClose } = props;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button id="cart-trigger" type="button" onClick={() => setIsOpen(true)}>
        Open cart
      </button>
      <CartDrawer
        isOpen={isOpen}
        onClose={() => {
          onClose?.();
          setIsOpen(false);
        }}
        triggerButtonId="cart-trigger"
      />
    </>
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    push.mockReset();
    resetStores();
  });

  it('closes the empty-state continue shopping action and restores focus without navigation', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [],
      });
    });

    const onClose = vi.fn();
    renderWithProviders(<CartDrawerHarness onClose={onClose} />);

    const triggerButton = screen.getByRole('button', { name: 'Open cart' });
    await userEvent.click(triggerButton);

    await userEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(triggerButton).toHaveFocus();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('closes the footer continue shopping action and restores focus without navigation', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    const onClose = vi.fn();
    renderWithProviders(<CartDrawerHarness onClose={onClose} />);

    const triggerButton = screen.getByRole('button', { name: 'Open cart' });
    await userEvent.click(triggerButton);

    await userEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(triggerButton).toHaveFocus();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('removes a cart item without showing a success alert', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a shipping and returns reminder for standard carts in the drawer', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }));

    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
    expect(screen.queryByText(/Kuji items are random draw and final sale/i)).not.toBeInTheDocument();
  });

  it('shows compact flat shipping progress in the drawer footer', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14899 } })],
      });
    });

    renderWithProviders(<CartDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }));

    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('You are $0.01 away from free shipping.')).toBeInTheDocument();
    expect(screen.queryByText(/tax/i)).not.toBeInTheDocument();
  });

  it('shows compact free shipping confirmation in the drawer footer', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { priceCents: 14900 } })],
      });
    });

    renderWithProviders(<CartDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }));

    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('You qualify for free shipping.')).toBeInTheDocument();
  });

  it('shows a kuji-specific reminder in the drawer when kuji items are present', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ product: { productType: 'kuji' } })],
      });
    });

    renderWithProviders(<CartDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }));

    expect(screen.getByText(/Kuji items are random draw and final sale/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/legal/shipping-returns');
  });
});
