import { type MouseEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutHandoffOverlay } from '@/components/cart/checkout-handoff-overlay';

describe('CheckoutHandoffOverlay', () => {
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

    expect(clickWasAllowed).toBe(false);
    expect(handleNavClick).not.toHaveBeenCalled();
  });
});
