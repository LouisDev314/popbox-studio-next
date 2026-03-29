import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  delay,
  http,
  HttpResponse,
} from 'msw';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/utils/checkout', async () => {
  const actual = await vi.importActual<typeof import('@/utils/checkout')>('@/utils/checkout');

  return {
    ...actual,
    redirectToCheckout: vi.fn(),
  };
});

import { CheckoutButton } from '@/components/cart/checkout-button';
import { useCartStore } from '@/hooks/use-cart';
import { redirectToCheckout } from '@/utils/checkout';
import { server } from '../msw/server';
import {
  createCartItem,
  createCheckoutSessionResponse,
  createInvalidCartItem,
} from '../fixtures';
import { renderWithProviders } from '../test-utils';

const CHECKOUT_URL = /\/api\/v1\/checkout\/session$/;

describe('CheckoutButton', () => {
  it('keeps checkout blocked until invalid items are removed', async () => {
    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [createInvalidCartItem()],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CheckoutButton />);

    const button = screen.getByRole('button', { name: 'Check Out' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('no longer valid');

    act(() => {
      useCartStore.getState().removeInvalidItem('invalid-cart-item-1');
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('sends the correct request payload and redirects on success', async () => {
    let requestBody: unknown = null;

    server.use(
      http.post(CHECKOUT_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(createCheckoutSessionResponse());
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem({ quantity: 2 })],
      });
    });

    renderWithProviders(<CheckoutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });

    expect(requestBody).toEqual({
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 2,
        },
      ],
    });
  });

  it('surfaces backend validation errors clearly', async () => {
    server.use(
      http.post(CHECKOUT_URL, async () => {
        return HttpResponse.json({
          code: 400,
          data: null,
          errors: {
            items: [
              {
                productId: ['Invalid UUID'],
              },
            ],
          },
          message: 'Invalid request body - checkout request',
          status: 'error',
          success: false,
        }, { status: 400 });
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CheckoutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'One or more items in your cart are no longer valid.',
      );
    });
  });

  it('prevents duplicate checkout submissions while the first request is in flight', async () => {
    let requestCount = 0;

    server.use(
      http.post(CHECKOUT_URL, async () => {
        requestCount += 1;
        await delay(100);
        return HttpResponse.json(createCheckoutSessionResponse('https://checkout.stripe.com/pay/cs_test_duplicate'));
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CheckoutButton />);
    const button = screen.getByRole('button', { name: 'Check Out' });

    await Promise.all([
      userEvent.click(button),
      userEvent.click(button),
    ]);

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledTimes(1);
    });
    expect(requestCount).toBe(1);
  });
});
