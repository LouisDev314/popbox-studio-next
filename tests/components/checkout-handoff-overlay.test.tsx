import { type MouseEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutHandoffOverlay } from '@/components/cart/checkout-handoff-overlay';

describe('CheckoutHandoffOverlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures full-page clicks so links behind the checkout handoff overlay do not navigate', () => {
    const handleNavClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });

    render(
      <>
        <Link href="/products" onClick={handleNavClick}>Products</Link>
        <CheckoutHandoffOverlay />
      </>,
    );

    const overlay = screen.getByRole('status', { name: /Preparing secure checkout/i });

    expect(overlay.parentElement).toBe(document.body);

    const clickWasAllowed = fireEvent.click(overlay);

    expect(clickWasAllowed).toBe(true);
    expect(handleNavClick).not.toHaveBeenCalled();
  });

  it('blocks wheel and touch scrolling with non-passive native listeners', () => {
    const addEventListenerSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');

    render(<CheckoutHandoffOverlay />);

    const overlay = screen.getByRole('status', { name: /Preparing secure checkout/i });
    const wheelEvent = new WheelEvent('wheel', { cancelable: true });
    const touchMoveEvent = new Event('touchmove', { cancelable: true });

    expect(overlay.dispatchEvent(wheelEvent)).toBe(false);
    expect(overlay.dispatchEvent(touchMoveEvent)).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(touchMoveEvent.defaultPrevented).toBe(true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
  });
});
