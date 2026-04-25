import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getFriendlyErrorMessage } from '@/utils/api-errors';

function createAxiosError(data: unknown, status = 500, message = 'Request failed with status code 500') {
  return new AxiosError(message, undefined, undefined, undefined, {
    data,
    status,
    statusText: 'Server Error',
    headers: {},
    config: {},
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
