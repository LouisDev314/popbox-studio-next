import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
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

import { CartCheckoutPanel } from '@/components/cart/cart-checkout-panel';
import { useCartStore } from '@/hooks/use-cart';
import { redirectToCheckout } from '@/utils/checkout';
import { server } from '../msw/server';
import {
  createCartItem,
  createCheckoutSessionResponse,
} from '../fixtures';
import {
  renderWithProviders,
  resetStores,
} from '../test-utils';

const QUOTE_URL = /\/api\/v1\/checkout\/quote$/;
const SESSION_URL = /\/api\/v1\/checkout\/session$/;

function createQuoteResponse(overrides: Partial<{
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}> = {}) {
  const data = {
    subtotalCents: 4999,
    shippingCents: 1200,
    taxCents: 744,
    totalCents: 6943,
    ...overrides,
    taxBreakdown: {
      countryCode: 'CA',
      provinceCode: 'BC',
      taxableAmountCents: 6199,
      gstRatePpm: 50000,
      pstRatePpm: 70000,
      hstRatePpm: 0,
      qstRatePpm: 0,
      gstCents: 310,
      pstCents: 434,
      hstCents: 0,
      qstCents: 0,
      totalTaxCents: overrides.taxCents ?? 744,
    },
  };

  return {
    code: 200,
    data,
    message: 'Checkout quote calculated',
    status: 'success',
    success: true,
  };
}

async function fillValidCheckoutForm() {
  await userEvent.type(screen.getByLabelText('Email'), 'customer@example.com');
  await userEvent.type(screen.getByLabelText('First name (optional)'), 'Ada');
  await userEvent.type(screen.getByLabelText('Last name (optional)'), 'Lovelace');
  await userEvent.type(screen.getByLabelText('Phone (optional)'), '+1 780 555 0100');
  await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText('Street address'), '123 Maple Street');
  await userEvent.type(screen.getByLabelText('City'), 'Vancouver');
  await userEvent.selectOptions(screen.getByLabelText('Province'), 'BC');
  await userEvent.type(screen.getByLabelText('Postal code'), 'V6B 1A1');
}

describe('CartCheckoutPanel', () => {
  it('keeps manual address entry usable when address autocomplete is unavailable', async () => {
    resetStores();

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByText('$69.43')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
  });

  it('renders backend quote totals and tax breakdown without calculating totals on the client', async () => {
    resetStores();
    let requestBody: unknown = null;

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(createQuoteResponse());
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByText('$49.99')).toBeInTheDocument();
      expect(screen.getByText('$12.00')).toBeInTheDocument();
      expect(screen.getByText('$7.44')).toBeInTheDocument();
      expect(screen.getByText('$69.43')).toBeInTheDocument();
    });
    expect(screen.getByText('GST')).toBeInTheDocument();
    expect(screen.getByText('PST')).toBeInTheDocument();
    expect(requestBody).toMatchObject({
      billingSameAsShipping: true,
      email: 'customer@example.com',
      firstName: 'Ada',
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
        },
      ],
      lastName: 'Lovelace',
      phone: '+1 780 555 0100',
      shippingAddress: {
        city: 'Vancouver',
        countryCode: 'CA',
        fullName: 'Ada Lovelace',
        line1: '123 Maple Street',
        postalCode: 'V6B 1A1',
        province: 'BC',
      },
    });
  });

  it('shows quote validation errors and keeps checkout disabled', async () => {
    resetStores();

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json({
        code: 400,
        errors: {
          errors: ['Shipping countryCode must be CA'],
        },
        message: 'Invalid request body - checkout quote request',
        success: false,
      }, { status: 400 })),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid request body - checkout quote request');
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeDisabled();
  });

  it('invalidates a successful quote when the cart changes', async () => {
    resetStores();
    let quoteCount = 0;

    server.use(
      http.post(QUOTE_URL, async () => {
        quoteCount += 1;
        return HttpResponse.json(createQuoteResponse({
          subtotalCents: quoteCount === 1 ? 4999 : 9998,
          totalCents: quoteCount === 1 ? 6943 : 12542,
        }));
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    act(() => {
      useCartStore.getState().updateQuantity('cart-item-1', 2);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeDisabled();
    });
    await waitFor(() => {
      expect(screen.getByText('$125.42')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
  });

  it('creates checkout with only cart, contact, and shipping payload after a fresh quote', async () => {
    resetStores();
    let sessionBody: Record<string, unknown> | null = null;
    let idempotencyKey: string | null = null;

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async ({ request }) => {
        sessionBody = await request.json() as Record<string, unknown>;
        idempotencyKey = request.headers.get('Idempotency-Key');
        return HttpResponse.json(createCheckoutSessionResponse(), { status: 201 });
      }),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(idempotencyKey).toMatch(/^checkout-/);
    expect(sessionBody).toMatchObject({
      billingSameAsShipping: true,
      email: 'customer@example.com',
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
        },
      ],
      shippingAddress: {
        countryCode: 'CA',
        province: 'BC',
      },
    });
    expect(sessionBody).not.toHaveProperty('subtotalCents');
    expect(sessionBody).not.toHaveProperty('shippingCents');
    expect(sessionBody).not.toHaveProperty('taxCents');
    expect(sessionBody).not.toHaveProperty('totalCents');
    expect(sessionBody).not.toHaveProperty('taxBreakdown');
    expect(sessionBody).not.toHaveProperty('contact');
  });
});
