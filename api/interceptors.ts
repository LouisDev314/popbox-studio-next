import {
  AxiosError,
  AxiosInstance,
  HttpStatusCode,
} from 'axios';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { isBaseApiResponse } from '@/utils/api-errors';

function normalizeParams(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function createFallbackResponse(error: AxiosError): IBaseApiResponse<null> {
  return {
    status: 'error',
    code: (error.response?.status ?? HttpStatusCode.InternalServerError) as HttpStatusCode,
    success: false,
    message: error.message.trim() || 'Request failed.',
    data: null,
  };
}

export const responseInterceptor = (axios: AxiosInstance) => {
  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response && !isBaseApiResponse(error.response.data)) {
        error.response.data = createFallbackResponse(error);
      }

      return Promise.reject(error);
    },
  );
};

export const requestInterceptor = (axios: AxiosInstance) => {
  axios.interceptors.request.use(async (config) => {
    config.params = normalizeParams(config.params);
    return config;
  });
};
