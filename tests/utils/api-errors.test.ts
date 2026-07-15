import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import {
  getCheckoutAddressError,
  getCheckoutQuoteErrorMessage,
  getFriendlyErrorMessage,
  getAccountApiErrorCode,
  getApiErrorCode,
} from '@/utils/api-errors';

function createAxiosError(
  data: unknown,
  status = 500,
  message = 'Request failed with status code 500',
): AxiosError<IBaseApiResponse<unknown>> {
  return new AxiosError(message, undefined, undefined, undefined, {
    data: data as IBaseApiResponse<unknown>,
    status,
    statusText: 'Server Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe('getFriendlyErrorMessage', () => {
  it('prefers a backend message over the fallback', () => {
    const error = createAxiosError({
      code: 400,
      data: null,
      message: 'Please choose a valid shipping province.',
      status: 'error',
      success: false,
    }, 400);

    expect(getFriendlyErrorMessage(error, 'Fallback message.')).toBe('Please choose a valid shipping province.');
  });

  it('uses a backend error field when message is unavailable', () => {
    const error = createAxiosError({
      error: 'This product could not be saved.',
    }, 400);

    expect(getFriendlyErrorMessage(error, 'Fallback message.')).toBe('This product could not be saved.');
  });

  it('falls back instead of exposing raw Axios status messages', () => {
    const error = createAxiosError({
      code: 500,
      data: null,
      message: 'Request failed with status code 500',
      status: 'error',
      success: false,
    });

    expect(getFriendlyErrorMessage(error, 'Please try again later.')).toBe('Please try again later.');
  });

  it('maps network errors to a connection message', () => {
    const error = new AxiosError('Network Error');

    expect(getFriendlyErrorMessage(error)).toBe('Network error. Please check your connection.');
  });
});

describe('API error codes', () => {
  it('reads and classifies stable backend account codes', () => {
    const error = createAxiosError({
      code: 401,
      data: null,
      errors: { code: 'AUTH_TOKEN_INVALID' },
      message: 'Unauthorized',
      status: 'error',
      success: false,
    }, 401);

    expect(getApiErrorCode(error)).toBe('AUTH_TOKEN_INVALID');
    expect(getAccountApiErrorCode(error)).toBe('AUTH_TOKEN_INVALID');
  });
});

describe('getCheckoutAddressError', () => {
  it('extracts a suggested address from ADDRESS_NEEDS_CONFIRMATION', () => {
    const error = createAxiosError({
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
        },
      },
      message: 'Please confirm the corrected shipping address before checkout.',
      success: false,
    }, 422);

    expect(getCheckoutAddressError(error)).toEqual({
      code: 'ADDRESS_NEEDS_CONFIRMATION',
      message: 'Please confirm the corrected shipping address before checkout.',
      suggestedAddress: {
        line1: '123 Queen St W',
        line2: '',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5H 2M9',
        countryCode: 'CA',
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
  ])('maps %s to checkout copy', (code, message) => {
    const error = createAxiosError({
      code: 422,
      errors: {
        code,
        message: 'Raw backend message.',
      },
      message: 'Raw backend message.',
      success: false,
    }, 422);

    expect(getCheckoutAddressError(error)).toEqual({
      code,
      message,
      suggestedAddress: null,
    });
  });

  it('falls back to retry copy when confirmation response is missing a usable suggested address', () => {
    const error = createAxiosError({
      code: 422,
      errors: {
        code: 'ADDRESS_NEEDS_CONFIRMATION',
        message: 'Please confirm the corrected shipping address before checkout.',
        suggestedAddress: {
          line1: '123 Queen St W',
          city: 'Toronto',
          province: 'WA',
          postalCode: 'M5H 2M9',
          countryCode: 'US',
        },
      },
      message: 'Please confirm the corrected shipping address before checkout.',
      success: false,
    }, 422);

    expect(getCheckoutAddressError(error)).toEqual({
      code: 'ADDRESS_VALIDATION_UNAVAILABLE',
      message: 'Address validation is temporarily unavailable. Please try again.',
      suggestedAddress: null,
    });
  });
});

describe('getCheckoutQuoteErrorMessage', () => {
  it('uses quote-specific copy for non-address quote failures', () => {
    const error = createAxiosError({
      code: 400,
      errors: {
        code: 'CHECKOUT_QUOTE_INVALID',
        fieldErrors: {
          properties: {
            shippingAddress: {
              errors: ['Invalid shipping address'],
            },
          },
        },
      },
      message: 'We couldn’t start checkout because the payment link was invalid.',
      success: false,
    }, 400);

    expect(getCheckoutQuoteErrorMessage(error)).toBe(
      'We couldn’t estimate tax for this address. Review your shipping details and try again.',
    );
  });
});
