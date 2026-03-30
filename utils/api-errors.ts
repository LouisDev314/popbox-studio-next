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
