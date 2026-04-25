import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  delay,
  http,
  HttpResponse,
} from 'msw';
import { AxiosError } from 'axios';
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
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import MutationConfigs from '@/configs/api/mutation-config';
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
    const alert = screen.getByRole('alert');

    expect(button).toBeDisabled();
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('no longer valid');

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
      const alert = screen.getByRole('alert');

      expect(alert).toHaveTextContent('Something went wrong');
      expect(alert).toHaveTextContent(
        'One or more items in your cart are no longer valid.',
      );
    });
  });

  it('shows the no-close checkout dialog for 409 conflicts', async () => {
    server.use(
      http.post(CHECKOUT_URL, async () => {
        return HttpResponse.json({
          code: 409,
          data: null,
          message: 'Order can no longer be checked out',
          status: 'error',
          success: false,
        }, { status: 409 });
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
      expect(screen.getByRole('dialog')).toHaveTextContent(
        'This order can no longer be checked out because one or more items are no longer available.',
      );
    });

    expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Okay' })).toBeInTheDocument();
  });

  it('shows the generic retry dialog for 500 responses', async () => {
    server.use(
      http.post(CHECKOUT_URL, async () => {
        return HttpResponse.json({
          code: 500,
          data: null,
          message: 'Internal server error',
          status: 'error',
          success: false,
        }, { status: 500 });
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
      expect(screen.getByRole('dialog')).toHaveTextContent('Something went wrong. Please try again.');
    });

    expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
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

  it('surfaces timeout failures and clears the checkout pending state', async () => {
    vi.spyOn(MutationConfigs, 'createCheckoutSession').mockRejectedValue(
      new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED'),
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
      const alert = screen.getByRole('alert');

      expect(alert).toHaveTextContent('Something went wrong');
      expect(alert).toHaveTextContent(
        'We couldn’t start checkout before the request timed out. Please try again.',
      );
    });

    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(false);
  });
});
