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
import { WishlistDrawer } from '@/components/wishlist/wishlist-drawer';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { createWishlistItem } from '../fixtures';
import {
  renderWithProviders,
  resetStores,
} from '../test-utils';

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

interface IWishlistDrawerHarnessProps {
  onClose?: () => void;
}

function WishlistDrawerHarness(props: IWishlistDrawerHarnessProps) {
  const { onClose } = props;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button id="wishlist-trigger" type="button" onClick={() => setIsOpen(true)}>
        Open wishlist
      </button>
      <WishlistDrawer
        isOpen={isOpen}
        onClose={() => {
          onClose?.();
          setIsOpen(false);
        }}
        triggerButtonId="wishlist-trigger"
      />
    </>
  );
}

describe('WishlistDrawer', () => {
  beforeEach(() => {
    resetStores();
  });

  it('closes the continue shopping action and restores focus without navigation', async () => {
    act(() => {
      useWishlistStore.setState({
        hasHydrated: true,
        items: [],
      });
    });

    const onClose = vi.fn();
    renderWithProviders(<WishlistDrawerHarness onClose={onClose} />);

    const triggerButton = screen.getByRole('button', { name: 'Open wishlist' });
    await userEvent.click(triggerButton);

    await userEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(triggerButton).toHaveFocus();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes a wishlist item without a normal success alert', async () => {
    act(() => {
      useWishlistStore.setState({
        hasHydrated: true,
        items: [createWishlistItem()],
      });
    });

    renderWithProviders(<WishlistDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open wishlist' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
