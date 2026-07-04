import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { renderWithProviders } from '../test-utils';

describe('CheckoutButton', () => {
  it('renders as a submit button for the checkout form', () => {
    renderWithProviders(<CheckoutButton />);

    expect(screen.getByRole('button', { name: 'Check Out' })).toHaveAttribute('type', 'submit');
  });

  it('shows pending state and blocks interaction while checkout is submitting', () => {
    renderWithProviders(<CheckoutButton isPending />);

    const button = screen.getByRole('button', { name: 'Processing...' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('supports custom labels without owning checkout side effects', () => {
    renderWithProviders(<CheckoutButton label="Continue to payment" />);

    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeEnabled();
  });
});
