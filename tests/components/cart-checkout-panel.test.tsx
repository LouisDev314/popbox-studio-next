import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  http,
  HttpResponse,
} from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

const publicEnvMock = vi.hoisted(() => ({
  googleMapsApiKey: '',
}));
const analyticsMocks = vi.hoisted(() => ({
  trackAddToCart: vi.fn(),
  trackBeginCheckout: vi.fn(),
  trackRemoveFromCart: vi.fn(),
}));

vi.mock('@/lib/analytics', () => analyticsMocks);

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    apiBaseUrl: 'http://localhost:3000',
    googleMapsApiKey: publicEnvMock.googleMapsApiKey,
    isSiteOpen: true,
    siteUrl: 'http://localhost:3001',
    stripePublishableKey: '',
    supabasePublishableKey: '',
    supabaseUrl: '',
  }),
}));

vi.mock('@/utils/checkout', async () => {
  const actual = await vi.importActual<typeof import('@/utils/checkout')>('@/utils/checkout');

  return {
    ...actual,
    redirectToCheckout: vi.fn(),
  };
});

import { CartCheckoutPanel } from '@/components/cart/cart-checkout-panel';
import { useCartStore } from '@/hooks/use-cart';
import { getValidatedCheckoutUrl, redirectToCheckout } from '@/utils/checkout';
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

function createGooglePrediction(description: string): GoogleAutocompletePrediction {
  return {
    placePrediction: {
      text: { toString: () => description },
      toPlace: vi.fn(() => ({
        addressComponents: [],
        fetchFields: vi.fn(async () => undefined),
      })),
    },
  };
}

interface GoogleAutocompletePrediction {
  placePrediction: {
    text: { toString: () => string };
    toPlace: ReturnType<typeof vi.fn<() => {
      addressComponents?: GoogleAddressComponent[];
      fetchFields: ReturnType<typeof vi.fn<(request: GooglePlaceDetailsRequest) => Promise<void>>>;
    }>>;
  };
}

interface GoogleAddressComponent {
  longText?: string;
  long_name: string;
  shortText?: string;
  short_name: string;
  types: string[];
}

interface GooglePredictionRequest {
  includedPrimaryTypes?: string[];
  includedRegionCodes?: string[];
  input: string;
  language: 'en-CA';
  locationRestriction?: {
    east: number;
    north: number;
    south: number;
    west: number;
  };
  region: 'ca';
  sessionToken: unknown;
}

interface GooglePlaceDetailsRequest {
  fields: string[];
}

interface MockGooglePlaces {
  AutocompleteSessionToken: ReturnType<typeof vi.fn<() => unknown>>;
  fetchAutocompleteSuggestions: ReturnType<typeof vi.fn<(request: GooglePredictionRequest) => Promise<{
    suggestions: GoogleAutocompletePrediction[];
  }>>>;
  fetchFields: ReturnType<typeof vi.fn<(request: GooglePlaceDetailsRequest) => Promise<void>>>;
  importLibrary: ReturnType<typeof vi.fn<(libraryName: 'places') => Promise<unknown>>>;
  toPlace: ReturnType<typeof vi.fn<() => {
    addressComponents?: GoogleAddressComponent[];
    fetchFields: ReturnType<typeof vi.fn<(request: GooglePlaceDetailsRequest) => Promise<void>>>;
  }>>;
}

function installMockGooglePlaces(): MockGooglePlaces {
  const AutocompleteSessionToken = vi.fn(() => ({}));
  const fetchFields = vi.fn(async () => undefined);
  const place = {
    addressComponents: [
      { long_name: '123', longText: '123', short_name: '123', shortText: '123', types: ['street_number'] },
      { long_name: 'Maple Street', longText: 'Maple Street', short_name: 'Maple St', shortText: 'Maple St', types: ['route'] },
      { long_name: 'Unit 1204', longText: 'Unit 1204', short_name: '1204', shortText: '1204', types: ['subpremise'] },
      { long_name: 'Vancouver', longText: 'Vancouver', short_name: 'Vancouver', shortText: 'Vancouver', types: ['locality'] },
      { long_name: 'British Columbia', longText: 'British Columbia', short_name: 'BC', shortText: 'BC', types: ['administrative_area_level_1'] },
      { long_name: 'V6B 1A1', longText: 'V6B 1A1', short_name: 'V6B 1A1', shortText: 'V6B 1A1', types: ['postal_code'] },
      { long_name: 'Canada', longText: 'Canada', short_name: 'CA', shortText: 'CA', types: ['country'] },
    ],
    fetchFields,
  };
  const toPlace = vi.fn(() => place);
  const fetchAutocompleteSuggestions = vi.fn(async () => ({
    suggestions: [
      {
        placePrediction: {
          text: { toString: () => '123 Maple Street, Vancouver, BC, Canada' },
          toPlace,
        },
      },
    ],
  }));
  const importLibrary = vi.fn(async (libraryName: 'places') => {
    if (libraryName !== 'places') {
      throw new Error(`Unexpected library ${libraryName}`);
    }

    return {
      AutocompleteSessionToken,
      AutocompleteSuggestion: {
        fetchAutocompleteSuggestions,
      },
    };
  });
  const browserWindow = window as Window & {
    google?: {
      maps?: {
        importLibrary: typeof importLibrary;
        places?: {
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: typeof fetchAutocompleteSuggestions;
          };
        };
      };
    };
  };

  browserWindow.google = {
    maps: {
      importLibrary,
      places: {
        AutocompleteSuggestion: {
          fetchAutocompleteSuggestions,
        },
      },
    },
  };

  return {
    AutocompleteSessionToken,
    fetchAutocompleteSuggestions,
    fetchFields,
    importLibrary,
    toPlace,
  };
}

afterEach(() => {
  analyticsMocks.trackAddToCart.mockClear();
  analyticsMocks.trackBeginCheckout.mockClear();
  analyticsMocks.trackRemoveFromCart.mockClear();
  publicEnvMock.googleMapsApiKey = '';
  delete (window as Window & { google?: unknown }).google;
  document
    .querySelectorAll('script[data-popbox-google-places="true"]')
    .forEach((script) => script.remove());
});

function createQuoteResponse(overrides: Partial<{
  appliedFreeShippingThresholdCents: number;
  shippingRegion: 'calgary' | 'alberta' | 'canada';
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

function createAddressNeedsConfirmationResponse(suggestedAddress: Partial<{
  city: string;
  countryCode: 'CA';
  line1: string;
  line2: string;
  postalCode: string;
  province: string;
}> = {}) {
  return {
    code: 422,
    errors: {
      code: 'ADDRESS_NEEDS_CONFIRMATION',
      message: 'Please confirm the corrected shipping address before checkout.',
      suggestedAddress: {
        line1: '123 Queen St W',
        line2: '',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5H 2M9',
        countryCode: 'CA',
        ...suggestedAddress,
      },
    },
    message: 'Please confirm the corrected shipping address before checkout.',
    success: false,
  };
}

function createAddressErrorResponse(code: string) {
  return {
    code: 422,
    errors: {
      code,
      message: 'Raw backend address validation message.',
    },
    message: 'Raw backend address validation message.',
    success: false,
  };
}

async function fillValidCheckoutForm() {
  await userEvent.type(screen.getByLabelText('Email'), 'customer@example.com');
  await userEvent.type(screen.getByLabelText('Phone (optional)'), '+1 780 555 0100');
  await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText('Street address'), '123 Maple Street');
  await userEvent.type(screen.getByLabelText('City'), 'Vancouver');
  await userEvent.selectOptions(screen.getByLabelText('Province'), 'BC');
  await userEvent.type(screen.getByLabelText('Postal code'), 'V6B 1A1');
}

async function fillTorontoCheckoutForm() {
  await userEvent.type(screen.getByLabelText('Email'), 'customer@example.com');
  await userEvent.type(screen.getByLabelText('Phone (optional)'), '+1 780 555 0100');
  await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText('Street address'), '123 Queen St. W');
  await userEvent.type(screen.getByLabelText('City'), 'toronto');
  await userEvent.selectOptions(screen.getByLabelText('Province'), 'ON');
  await userEvent.type(screen.getByLabelText('Postal code'), 'm5h2m9');
}

describe('CartCheckoutPanel', () => {
  it('keeps manual address entry usable when address autocomplete is unavailable', async () => {
    resetStores();

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async () => HttpResponse.json(createCheckoutSessionResponse(), { status: 201 })),
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

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(analyticsMocks.trackBeginCheckout).toHaveBeenCalledOnce();
    expect(analyticsMocks.trackBeginCheckout).toHaveBeenCalledWith(useCartStore.getState().items);
  });

  it('keeps manual address entry usable when the Google Maps script fails', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async () => HttpResponse.json(createCheckoutSessionResponse(), { status: 201 })),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await waitFor(() => {
      expect(document.querySelectorAll('script[data-popbox-google-places="true"]')).toHaveLength(1);
    });

    act(() => {
      document
        .querySelector<HTMLScriptElement>('script[data-popbox-google-places="true"]')
        ?.dispatchEvent(new Event('error'));
    });

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByText('$69.43')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
  });

  it('keeps manual address entry usable when Google loads without importLibrary', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';

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

    await waitFor(() => {
      expect(document.querySelectorAll('script[data-popbox-google-places="true"]')).toHaveLength(1);
    });

    act(() => {
      (window as Window & {
        google?: {
          maps?: {
            __ib__?: () => void;
          };
        };
      }).google?.maps?.__ib__?.();
    });

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByText('$69.43')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
  });

  it('fills checkout address fields from a Canadian Google Places prediction without blocking manual edits', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';
    const googlePlaces = installMockGooglePlaces();
    const quoteBodies: unknown[] = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        quoteBodies.push(await request.json());
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

    await userEvent.type(screen.getByLabelText('Street address'), '123 Map');

    expect(await screen.findByRole('option', {
      name: '123 Maple Street, Vancouver, BC, Canada',
    })).toBeInTheDocument();
    expect(googlePlaces.importLibrary).toHaveBeenCalledWith('places');
    expect(googlePlaces.fetchAutocompleteSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        includedRegionCodes: ['ca'],
        language: 'en-CA',
        region: 'ca',
        sessionToken: expect.anything(),
      }),
    );
    expect(googlePlaces.fetchAutocompleteSuggestions.mock.calls[0]?.[0]).not.toHaveProperty('includedPrimaryTypes');
    expect(googlePlaces.fetchAutocompleteSuggestions.mock.calls[0]?.[0]).not.toHaveProperty('locationRestriction');

    await userEvent.click(screen.getByRole('option', {
      name: '123 Maple Street, Vancouver, BC, Canada',
    }));

    expect(googlePlaces.toPlace).toHaveBeenCalled();
    expect(googlePlaces.fetchFields).toHaveBeenCalledWith({
      fields: ['addressComponents'],
    });
    expect(screen.getByLabelText('Street address')).toHaveValue('123 Maple Street');
    expect(screen.getByLabelText('Apartment, suite, etc. (optional)')).toHaveValue('Unit 1204');
    expect(screen.getByLabelText('City')).toHaveValue('Vancouver');
    expect(screen.getByLabelText('Province')).toHaveValue('BC');
    expect(screen.getByLabelText('Postal code')).toHaveValue('V6B 1A1');
    expect(screen.getByLabelText('Country')).toHaveValue('Canada');
    expect(screen.queryByRole('option', {
      name: '123 Maple Street, Vancouver, BC, Canada',
    })).not.toBeInTheDocument();
    expect(googlePlaces.AutocompleteSessionToken).toHaveBeenCalledTimes(2);

    await userEvent.type(screen.getByLabelText('Email'), 'customer@example.com');
    await userEvent.type(screen.getByLabelText('Phone (optional)'), '+1 780 555 0100');
    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');

    await waitFor(() => {
      expect(quoteBodies.length).toBeGreaterThan(0);
    });
    expect(JSON.stringify(quoteBodies.at(-1))).not.toContain('addressComponents');
    expect(JSON.stringify(quoteBodies.at(-1))).not.toContain('placePrediction');

    await userEvent.clear(screen.getByLabelText('Street address'));
    await userEvent.type(screen.getByLabelText('Street address'), '125 Maple Street');

    expect(screen.getByLabelText('Street address')).toHaveValue('125 Maple Street');
  });

  it('keeps stale Google autocomplete responses from overwriting newer suggestions', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';
    const googlePlaces = installMockGooglePlaces();
    let resolveFirstRequest: ((response: { suggestions: GoogleAutocompletePrediction[] }) => void) | null = null;
    let resolveSecondRequest: ((response: { suggestions: GoogleAutocompletePrediction[] }) => void) | null = null;

    googlePlaces.fetchAutocompleteSuggestions.mockImplementation((request) => new Promise((resolve) => {
      if (request.input === '123 Map') {
        resolveFirstRequest = resolve;
        return;
      }

      if (request.input === '123 Maple') {
        resolveSecondRequest = resolve;
        return;
      }

      resolve({ suggestions: [] });
    }));

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    await userEvent.type(screen.getByLabelText('Street address'), '123 Map');

    await waitFor(() => {
      expect(resolveFirstRequest).not.toBeNull();
    });

    await userEvent.type(screen.getByLabelText('Street address'), 'le');

    await waitFor(() => {
      expect(resolveSecondRequest).not.toBeNull();
    });

    act(() => {
      resolveSecondRequest?.({
        suggestions: [createGooglePrediction('123 Maple Avenue, Toronto, ON, Canada')],
      });
    });

    expect(await screen.findByRole('option', {
      name: '123 Maple Avenue, Toronto, ON, Canada',
    })).toBeInTheDocument();

    act(() => {
      resolveFirstRequest?.({
        suggestions: [createGooglePrediction('123 Map Road, Calgary, AB, Canada')],
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('option', {
        name: '123 Map Road, Calgary, AB, Canada',
      })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('option', {
      name: '123 Maple Avenue, Toronto, ON, Canada',
    })).toBeInTheDocument();
  });

  it('keeps Google autocomplete visible when typing line 1 after accepting a backend suggestion', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';
    const googlePlaces = installMockGooglePlaces();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createQuoteResponse());
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    googlePlaces.fetchAutocompleteSuggestions.mockClear();

    await userEvent.clear(screen.getByLabelText('Street address'));
    await userEvent.type(screen.getByLabelText('Street address'), '123 Map');

    await waitFor(() => {
      expect(googlePlaces.fetchAutocompleteSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          includedRegionCodes: ['ca'],
          input: '123 Map',
        }),
      );
    });
    expect(screen.getByRole('option', {
      name: '123 Maple Street, Vancouver, BC, Canada',
    })).toBeInTheDocument();

    await waitFor(() => {
      expect(quoteBodies.at(-1)).not.toHaveProperty('confirmedAddress');
    });
  });

  it('loads the Google Maps script once when autocomplete initializes without an existing library', async () => {
    resetStores();
    publicEnvMock.googleMapsApiKey = 'test-public-google-key';

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    const firstRender = renderWithProviders(<CartCheckoutPanel />);

    await waitFor(() => {
      expect(document.querySelectorAll('script[data-popbox-google-places="true"]')).toHaveLength(1);
    });

    firstRender.unmount();
    renderWithProviders(<CartCheckoutPanel />);

    await waitFor(() => {
      expect(document.querySelectorAll('script[data-popbox-google-places="true"]')).toHaveLength(1);
    });
  });

  it('renders backend quote totals and tax breakdown without calculating totals on the client', async () => {
    resetStores();
    let requestBody: unknown = null;

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(createQuoteResponse({
          appliedFreeShippingThresholdCents: 14900,
          shippingCents: 1599,
          shippingRegion: 'canada',
          totalCents: 7342,
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
      expect(screen.getByText('$49.99')).toBeInTheDocument();
      expect(screen.getByText('$15.99')).toBeInTheDocument();
      expect(screen.getByText('$7.44')).toBeInTheDocument();
      expect(screen.getByText('$73.42')).toBeInTheDocument();
      expect(screen.getByText('You’re $99.01 away from free shipping.')).toBeInTheDocument();
    });
    expect(screen.getByText('GST 5%')).toBeInTheDocument();
    expect(screen.getByText('PST 7%')).toBeInTheDocument();
    expect(screen.queryByText(/Backend quote/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('cart-summary-backend-totals')).toBeInTheDocument();
    expect(requestBody).toMatchObject({
      billingSameAsShipping: true,
      email: 'customer@example.com',
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
        },
      ],
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
    expect(requestBody).not.toHaveProperty('firstName');
    expect(requestBody).not.toHaveProperty('lastName');
  });

  it('shows one full name field and places the only checkout button below the order summary', () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    expect(screen.getAllByLabelText('Full name')).toHaveLength(1);
    expect(screen.queryByLabelText(/First name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Last name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Backend quote/i)).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: 'Check Out' });
    expect(buttons).toHaveLength(1);
    expect(screen.getByTestId('cart-checkout-submit')).toBe(buttons[0]);

    const summaryColumn = screen.getByTestId('cart-summary-column');

    expect(within(summaryColumn).getByTestId('cart-summary')).toBeInTheDocument();
    expect(within(summaryColumn).getByTestId('cart-checkout-submit')).toBeInTheDocument();
  });

  it('renders an optional order note field with a live 200 character counter', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    const noteField = screen.getByLabelText('Order Note (Optional)');

    expect(noteField).toHaveAttribute('placeholder', 'Add preferred prize variant. Subject to availability.');
    expect(noteField).toHaveAttribute('maxLength', '200');
    expect(screen.getByText('0 / 200')).toBeInTheDocument();

    await userEvent.type(noteField, 'Please pack carefully.');

    expect(screen.getByText('22 / 200')).toBeInTheDocument();
  });

  it('prevents typing more than 200 order note characters', async () => {
    resetStores();

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    renderWithProviders(<CartCheckoutPanel />);

    const noteField = screen.getByLabelText('Order Note (Optional)');

    await userEvent.type(noteField, 'a'.repeat(205));

    expect(noteField).toHaveValue('a'.repeat(200));
    expect(screen.getByText('200 / 200')).toBeInTheDocument();
  });

  it('does not send order notes with checkout quotes or refetch quotes when notes change', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        quoteBodies.push(await request.json() as Record<string, unknown>);
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
      expect(screen.getByText('$69.43')).toBeInTheDocument();
    });

    const quoteCountAfterFreshQuote = quoteBodies.length;
    expect(quoteBodies.at(-1)).not.toHaveProperty('customerNote');

    await userEvent.type(screen.getByLabelText('Order Note (Optional)'), '  Please pack away from heavy items.  ');

    expect(quoteBodies).toHaveLength(quoteCountAfterFreshQuote);
    expect(screen.getByText('$69.43')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
  });

  it('keeps the order summary out of recalculating state when only the order note changes', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        quoteBodies.push(await request.json() as Record<string, unknown>);
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
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    const quoteCountAfterFreshQuote = quoteBodies.length;

    await userEvent.type(screen.getByLabelText('Order Note (Optional)'), 'Leave near the lobby.');

    expect(quoteBodies).toHaveLength(quoteCountAfterFreshQuote);
    expect(screen.getByText('$69.43')).toBeInTheDocument();
    expect(screen.queryByText('$61.99')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
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
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We couldn’t estimate tax for this address. Review your shipping details and try again.',
      );
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeDisabled();
    expect(analyticsMocks.trackBeginCheckout).not.toHaveBeenCalled();
  });

  it('shows address and tax copy for an ADDRESS_INVALID quote 400, never payment-link copy', async () => {
    resetStores();

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(
        createAddressErrorResponse('ADDRESS_INVALID'),
        { status: 400 },
      )),
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

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(
      'We could not validate this shipping address or product. Please check the street address, city, province and postal code, or the product availability.',
    );
    expect(alert).not.toHaveTextContent('payment link');
  });

  it('uses the confirmed canonical address while displaying backend-provided regional context', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createQuoteResponse({
            appliedFreeShippingThresholdCents: 7700,
            shippingRegion: 'calgary',
          }));
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    expect(screen.getByText('123 Queen St W')).toBeInTheDocument();
    expect(screen.getByText('Toronto, ON M5H 2M9')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    await waitFor(() => {
      expect(quoteBodies.some((body) => body.confirmedAddress === true)).toBe(true);
      expect(screen.getByText('You’re $27.01 away from free shipping in Calgary.')).toBeInTheDocument();
    });

    const confirmedBody = quoteBodies.find((body) => body.confirmedAddress === true);

    expect(confirmedBody).toMatchObject({
      confirmedAddress: true,
      phone: '+1 780 555 0100',
      shippingAddress: {
        city: 'Toronto',
        countryCode: 'CA',
        fullName: 'Ada Lovelace',
        line1: '123 Queen St W',
        line2: null,
        postalCode: 'M5H 2M9',
        province: 'ON',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });
  });

  it('does not show the same accepted suggested address again', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];
    let repeatedAcceptedSuggestion = true;

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createQuoteResponse());
        }

        if (quoteBodies.length > 1 && repeatedAcceptedSuggestion) {
          repeatedAcceptedSuggestion = false;
          return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    await waitFor(() => {
      expect(quoteBodies.some((body) => body.confirmedAddress === true)).toBe(true);
    });

    expect(screen.queryByText('Confirm your shipping address')).not.toBeInTheDocument();
  });

  it('skips address confirmation when the backend suggested address matches after normalization', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createQuoteResponse());
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse({
          city: 'Toronto',
          line1: '123 Queen St W',
          postalCode: 'M5H 2M9',
          province: 'ON',
        }), { status: 422 });
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

    await fillTorontoCheckoutForm();

    await waitFor(() => {
      expect(quoteBodies.some((body) => body.confirmedAddress === true)).toBe(true);
    });
    expect(screen.queryByText('Confirm your shipping address')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Street address')).toHaveValue('123 Queen St. W');
    expect(screen.getByLabelText('Postal code')).toHaveValue('m5h2m9');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });
  });

  it('clears address confirmation when the user edits the address manually', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (quoteBodies.length === 1) {
          return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
        }

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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit address' }));
    expect(screen.queryByText('Confirm your shipping address')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Street address'));
    await userEvent.type(screen.getByLabelText('Street address'), '125 Maple Street');

    await waitFor(() => {
      expect(quoteBodies.length).toBeGreaterThan(1);
    });
    expect(quoteBodies.at(-1)).not.toHaveProperty('confirmedAddress');
  });

  it('shows a new backend suggested address after accepting a different suggestion', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createAddressNeedsConfirmationResponse({
            city: 'Ottawa',
            line1: '99 Bank St',
            postalCode: 'K1P 6B9',
            province: 'ON',
          }), { status: 422 });
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    expect(await screen.findByText('99 Bank St')).toBeInTheDocument();
    expect(screen.getByText('Ottawa, ON K1P 6B9')).toBeInTheDocument();
    expect(quoteBodies.some((body) => body.confirmedAddress === true)).toBe(true);
  });

  it('clears the accepted suggested address marker when the user edits apartment or suite', async () => {
    resetStores();
    const quoteBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        quoteBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createQuoteResponse());
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    await userEvent.type(screen.getByLabelText('Apartment, suite, etc. (optional)'), 'Unit 4');

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    expect(quoteBodies.at(-1)).not.toHaveProperty('confirmedAddress');
  });

  it('does not redirect to Stripe when session requires address confirmation until the suggestion is accepted', async () => {
    resetStores();
    const sessionBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        sessionBodies.push(body);

        if (body.confirmedAddress === true) {
          return HttpResponse.json(createCheckoutSessionResponse(), { status: 201 });
        }

        return HttpResponse.json(createAddressNeedsConfirmationResponse(), { status: 422 });
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

    expect(await screen.findByText('Confirm your shipping address')).toBeInTheDocument();
    expect(redirectToCheckout).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Use suggested address' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(sessionBodies.at(-1)).toMatchObject({
      confirmedAddress: true,
      phone: '+1 780 555 0100',
      shippingAddress: {
        city: 'Toronto',
        countryCode: 'CA',
        fullName: 'Ada Lovelace',
        line1: '123 Queen St W',
        postalCode: 'M5H 2M9',
        province: 'ON',
      },
    });
  });

  it.each([
    [
      'ADDRESS_INVALID',
      'We could not validate this shipping address or product. Please check the street address, city, province and postal code, or the product availability.',
    ],
    [
      'ADDRESS_COUNTRY_UNSUPPORTED',
      'PopBox Studio currently only ships within Canada.',
    ],
    [
      'ADDRESS_VALIDATION_UNAVAILABLE',
      'Address validation is temporarily unavailable. Please try again.',
    ],
    [
      'ADDRESS_CONFIGURATION_ERROR',
      'Checkout is temporarily unavailable. Please try again later.',
    ],
  ])('shows friendly quote copy for %s', async (code, message) => {
    resetStores();

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createAddressErrorResponse(code), { status: 422 })),
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
      expect(screen.getByRole('alert')).toHaveTextContent(message);
    });
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

  it('ignores a stale quote response that arrives after the current cart quote', async () => {
    resetStores();
    let quoteCount = 0;
    let firstQuoteReturned = false;
    let resolveFirstQuote: (() => void) | null = null;

    server.use(
      http.post(QUOTE_URL, async () => {
        quoteCount += 1;

        if (quoteCount === 1) {
          await new Promise<void>((resolve) => {
            resolveFirstQuote = resolve;
          });

          firstQuoteReturned = true;
          return HttpResponse.json(createQuoteResponse({
            appliedFreeShippingThresholdCents: 7700,
            shippingRegion: 'calgary',
          }));
        }

        return HttpResponse.json(createQuoteResponse({
          appliedFreeShippingThresholdCents: 14900,
          shippingRegion: 'canada',
          subtotalCents: 9998,
          totalCents: 12542,
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
      expect(quoteCount).toBe(1);
    });

    act(() => {
      useCartStore.getState().updateQuantity('cart-item-1', 2);
    });

    await waitFor(() => {
      expect(screen.getByText('$125.42')).toBeInTheDocument();
      expect(screen.getByText('You’re $49.02 away from free shipping.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();

    act(() => {
      resolveFirstQuote?.();
    });

    await waitFor(() => {
      expect(firstQuoteReturned).toBe(true);
    });
    expect(screen.getByText('$125.42')).toBeInTheDocument();
    expect(screen.getByText('You’re $49.02 away from free shipping.')).toBeInTheDocument();
    expect(screen.queryByText(/free shipping in Calgary/i)).not.toBeInTheDocument();
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
      customerNote: null,
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
    expect(sessionBody).not.toHaveProperty('firstName');
    expect(sessionBody).not.toHaveProperty('lastName');
    expect(sessionBody).not.toHaveProperty('subtotalCents');
    expect(sessionBody).not.toHaveProperty('shippingCents');
    expect(sessionBody).not.toHaveProperty('shippingRegion');
    expect(sessionBody).not.toHaveProperty('appliedFreeShippingThresholdCents');
    expect(sessionBody).not.toHaveProperty('taxCents');
    expect(sessionBody).not.toHaveProperty('totalCents');
    expect(sessionBody).not.toHaveProperty('taxBreakdown');
    expect(sessionBody).not.toHaveProperty('contact');
  });

  it('clears and suppresses a quote error when checkout session creation succeeds', async () => {
    resetStores();
    let quoteCount = 0;
    let completeSession: (() => void) | null = null;

    server.use(
      http.post(QUOTE_URL, async () => {
        quoteCount += 1;

        if (quoteCount === 1) {
          return HttpResponse.json(createQuoteResponse());
        }

        return HttpResponse.json(createAddressErrorResponse('ADDRESS_INVALID'), { status: 400 });
      }),
      http.post(SESSION_URL, async () => new Promise((resolve) => {
        completeSession = () => {
          resolve(HttpResponse.json(createCheckoutSessionResponse(), { status: 201 }));
        };
      })),
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

    act(() => {
      const currentItem = useCartStore.getState().items[0];

      useCartStore.setState({
        items: currentItem ? [{ ...currentItem, quantity: 2 }] : [],
      });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not validate this shipping address or product.',
    );

    await act(async () => {
      completeSession?.();
    });

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(screen.queryByText(/We could not validate this shipping address or product/)).not.toBeInTheDocument();
  });

  it.each([
    ['a missing URL', undefined],
    ['an invalid URL', 'https://example.com/not-stripe'],
  ])('shows payment-link copy only when a successful session response contains %s', async (_label, checkoutUrl) => {
    resetStores();
    vi.mocked(redirectToCheckout).mockImplementationOnce((url) => {
      getValidatedCheckoutUrl(url);
    });

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async () => {
        const response = createCheckoutSessionResponse();

        return HttpResponse.json({
          ...response,
          data: {
            ...response.data,
            checkoutUrl,
          },
        }, { status: 201 });
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t start checkout because the payment link was invalid. Please try again.',
    );
  });

  it('sends a trimmed order note with checkout session requests', async () => {
    resetStores();
    let sessionBody: Record<string, unknown> | null = null;

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async ({ request }) => {
        sessionBody = await request.json() as Record<string, unknown>;
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

    await userEvent.type(screen.getByLabelText('Order Note (Optional)'), '  Ring the doorbell once.  ');
    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(sessionBody?.customerNote).toBe('Ring the doorbell once.');
  });

  it('sends a whitespace-only order note as null without blocking checkout', async () => {
    resetStores();
    let sessionBody: Record<string, unknown> | null = null;

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async ({ request }) => {
        sessionBody = await request.json() as Record<string, unknown>;
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

    await userEvent.type(screen.getByLabelText('Order Note (Optional)'), '     ');
    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
    });
    expect(sessionBody?.customerNote).toBeNull();
  });

  it('blocks the page while checkout session creation is pending and clears the lock after failure', async () => {
    resetStores();
    let failSession: (() => void) | null = null;

    server.use(
      http.post(QUOTE_URL, async () => HttpResponse.json(createQuoteResponse())),
      http.post(SESSION_URL, async () => new Promise((resolve) => {
        failSession = () => {
          resolve(HttpResponse.json({
            code: 400,
            message: 'Checkout validation failed.',
            success: false,
          }, { status: 400 }));
        };
      })),
    );

    act(() => {
      useCartStore.setState({
        hasHydrated: true,
        invalidItems: [],
        items: [createCartItem()],
      });
    });

    const { unmount } = renderWithProviders(<CartCheckoutPanel />);

    await fillValidCheckoutForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check Out' })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    const overlay = await screen.findByRole('status', { name: /Preparing secure checkout/i });

    expect(overlay).toHaveTextContent('Your cart is reserved until we hand you off to the secure checkout page.');
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-[2147483647]', 'pointer-events-auto');
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await act(async () => {
      failSession?.();
    });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /Preparing secure checkout/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Checkout validation failed.');
    expect(document.documentElement).not.toHaveStyle({ overflow: 'hidden' });
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });

    unmount();

    expect(document.documentElement).not.toHaveStyle({ overflow: 'hidden' });
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });
});
