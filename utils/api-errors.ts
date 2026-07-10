import { AxiosError, HttpStatusCode } from 'axios';
import {
  type IApiErrorDetails,
  type IApiValidationErrors,
  type IBaseApiResponse,
} from '@/interfaces/api-response';
import {
  type CanadianProvinceCode,
  type SuggestedShippingAddress,
} from '@/interfaces/checkout';
import { isCanadianProvinceCode } from '@/utils/checkout';

export type CheckoutAddressErrorCode =
  | 'ADDRESS_CONFIGURATION_ERROR'
  | 'ADDRESS_COUNTRY_UNSUPPORTED'
  | 'ADDRESS_INVALID'
  | 'ADDRESS_NEEDS_CONFIRMATION'
  | 'ADDRESS_VALIDATION_UNAVAILABLE';

interface ICheckoutAddressErrorDetails {
  code: CheckoutAddressErrorCode;
  message: string;
  suggestedAddress: SuggestedShippingAddress | null;
}

const CHECKOUT_ADDRESS_ERROR_MESSAGES: Record<CheckoutAddressErrorCode, string> = {
  ADDRESS_CONFIGURATION_ERROR: 'Checkout is temporarily unavailable. Please try again later.',
  ADDRESS_COUNTRY_UNSUPPORTED: 'PopBox Studio currently only ships within Canada.',
  ADDRESS_INVALID: 'We could not validate this shipping address. Please check the street address, city, province, and postal code.',
  ADDRESS_NEEDS_CONFIRMATION: 'Please confirm the corrected shipping address before checkout.',
  ADDRESS_VALIDATION_UNAVAILABLE: 'Address validation is temporarily unavailable. Please try again.',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getStringField(value: Record<string, unknown>, field: string): string {
  const fieldValue = value[field];

  return typeof fieldValue === 'string' ? fieldValue.trim() : '';
}

function isCheckoutAddressErrorCode(value: string): value is CheckoutAddressErrorCode {
  return Object.prototype.hasOwnProperty.call(CHECKOUT_ADDRESS_ERROR_MESSAGES, value);
}

function parseSuggestedShippingAddress(value: unknown): SuggestedShippingAddress | null {
  if (!isObject(value)) {
    return null;
  }

  const line1 = getStringField(value, 'line1');
  const line2 = getStringField(value, 'line2');
  const city = getStringField(value, 'city');
  const province = getStringField(value, 'province').toUpperCase();
  const postalCode = getStringField(value, 'postalCode');
  const countryCode = getStringField(value, 'countryCode').toUpperCase();

  if (
    !line1
    || !city
    || !postalCode
    || countryCode !== 'CA'
    || !isCanadianProvinceCode(province)
  ) {
    return null;
  }

  return {
    city,
    countryCode: 'CA',
    line1,
    line2,
    postalCode,
    province: province as CanadianProvinceCode,
  };
}

export function getCheckoutAddressError(
  error: AxiosError<IBaseApiResponse<unknown>>,
): ICheckoutAddressErrorDetails | null {
  const errors = error.response?.data?.errors;

  if (!isObject(errors)) {
    return null;
  }

  const code = getStringField(errors, 'code');

  if (!isCheckoutAddressErrorCode(code)) {
    return null;
  }

  if (code === 'ADDRESS_NEEDS_CONFIRMATION') {
    const suggestedAddress = parseSuggestedShippingAddress(errors.suggestedAddress);

    if (!suggestedAddress) {
      return {
        code: 'ADDRESS_VALIDATION_UNAVAILABLE',
        message: CHECKOUT_ADDRESS_ERROR_MESSAGES.ADDRESS_VALIDATION_UNAVAILABLE,
        suggestedAddress: null,
      };
    }

    return {
      code,
      message: CHECKOUT_ADDRESS_ERROR_MESSAGES[code],
      suggestedAddress,
    };
  }

  return {
    code,
    message: CHECKOUT_ADDRESS_ERROR_MESSAGES[code],
    suggestedAddress: null,
  };
}

export function getCheckoutQuoteErrorMessage(
  error: AxiosError<IBaseApiResponse<unknown>>,
): string {
  const checkoutAddressError = getCheckoutAddressError(error);

  if (checkoutAddressError) {
    return checkoutAddressError.message;
  }

  return 'We couldn’t estimate tax for this address. Review your shipping details and try again.';
}

function collectValidationMessages(
  value: IApiValidationErrors | undefined,
  path = '',
): string[] {
  if (value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return path ? [`${path}: ${value}`] : [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      const nextPath = path && !isObject(entry) ? `${path}[${index}]` : path;
      return collectValidationMessages(entry, nextPath);
    });
  }

  return Object.entries(value).flatMap(([key, entry]) => {
    const nextPath = path ? `${path}.${key}` : key;
    return collectValidationMessages(entry, nextPath);
  });
}

export function getFallbackApiErrorMessage(error: AxiosError): string {
  if (isTimeoutAxiosError(error)) {
    return 'The request timed out. Please try again.';
  }

  if (!error.response) {
    return 'We could not reach the service. Please try again.';
  }

  if (error.response.status >= HttpStatusCode.InternalServerError) {
    return 'The service is temporarily unavailable. Please try again.';
  }

  return error.message.trim() || 'Request failed.';
}

export function isTimeoutAxiosError(error: AxiosError): boolean {
  return error.code === 'ECONNABORTED' && error.message.toLowerCase().includes('timeout');
}

export function getApiErrorDetails(
  error: AxiosError<IBaseApiResponse<unknown>>,
  fallbackMessage = 'Request failed.',
): IApiErrorDetails {
  const response = error.response;
  const responseData = response?.data;
  const responseMessage = responseData?.message?.trim();
  const validationErrors = responseData?.errors;
  const validationMessages = collectValidationMessages(validationErrors);
  const status = response?.status;

  return {
    code: responseData?.code ?? status ?? HttpStatusCode.InternalServerError,
    message:
      responseMessage
      || validationMessages[0]
      || getFallbackApiErrorMessage(error)
      || fallbackMessage,
    validationErrors,
    validationMessages,
  };
}

function isRawAxiosStatusMessage(message: string): boolean {
  return /^request failed with status code \d+$/i.test(message.trim());
}

function getResponseStringField(data: unknown, field: string): string | null {
  if (!isObject(data)) {
    return null;
  }

  const value = data[field];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue && !isRawAxiosStatusMessage(trimmedValue)
    ? trimmedValue
    : null;
}

export function getFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
): string {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data;
    const validationMessages = isBaseApiResponse(responseData)
      ? collectValidationMessages(responseData.errors)
      : [];
    const responseMessage =
      getResponseStringField(responseData, 'message')
      || getResponseStringField(responseData, 'error')
      || validationMessages[0];

    if (responseMessage && !isRawAxiosStatusMessage(responseMessage)) {
      return responseMessage;
    }

    if (error.response) {
      return fallbackMessage;
    }

    if (error.message === 'Network Error') {
      return 'Network error. Please check your connection.';
    }

    const fallbackApiMessage = getFallbackApiErrorMessage(error);

    return isRawAxiosStatusMessage(fallbackApiMessage)
      ? fallbackMessage
      : fallbackApiMessage;
  }

  return fallbackMessage;
}

export function isBaseApiResponse(value: unknown): value is IBaseApiResponse<unknown> {
  return (
    isObject(value)
    && typeof value.message === 'string'
    && typeof value.success === 'boolean'
    && typeof value.code === 'number'
  );
}
