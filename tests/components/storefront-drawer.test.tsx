import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StorefrontDrawer } from '@/components/ui/storefront-drawer';
import { renderWithProviders } from '../test-utils';

function StorefrontDrawerHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button id="drawer-trigger" type="button" onClick={() => setIsOpen(true)}>
        Open drawer
      </button>
      <StorefrontDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerButtonId="drawer-trigger"
        title="Test drawer"
      >
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </StorefrontDrawer>
    </>
  );
}

describe('StorefrontDrawer', () => {
  it('moves focus into the drawer and restores it after escape close', async () => {
    renderWithProviders(<StorefrontDrawerHarness />);

    const trigger = screen.getByRole('button', { name: 'Open drawer' });
    await userEvent.click(trigger);

    const closeButton = screen.getByRole('button', { name: 'Close drawer' });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the overlay is clicked', async () => {
    const { container } = renderWithProviders(<StorefrontDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    const overlay = container.querySelector('[data-slot="storefront-drawer-overlay"]');

    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass('backdrop-blur-md');

    await userEvent.click(overlay as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('keeps keyboard focus trapped within the drawer while open', async () => {
    renderWithProviders(<StorefrontDrawerHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));

    const closeButton = screen.getByRole('button', { name: 'Close drawer' });
    const firstAction = screen.getByRole('button', { name: 'First action' });
    const secondAction = screen.getByRole('button', { name: 'Second action' });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    await userEvent.tab();
    expect(firstAction).toHaveFocus();

    await userEvent.tab();
    expect(secondAction).toHaveFocus();

    await userEvent.tab();
    expect(closeButton).toHaveFocus();
  });
});
