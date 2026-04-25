import { AxiosError, HttpStatusCode } from 'axios';
import {
  type IApiErrorDetails,
  type IApiValidationErrors,
  type IBaseApiResponse,
} from '@/interfaces/api-response';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  fallbackMessage = 'Unable to save changes. Please try again.',
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
    && typeof value.status === 'string'
    && typeof value.success === 'boolean'
    && typeof value.code === 'number'
    && 'data' in value
  );
}
