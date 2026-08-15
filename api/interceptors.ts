import {
  AxiosError,
  AxiosInstance,
  HttpStatusCode,
} from 'axios';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { isBaseApiResponse } from '@/utils/api-errors';
import {
  getAdminAccessToken,
  notifyAdminAuthFailure,
} from '@/lib/auth/admin-session-client';

type RetriableAdminRequestConfig = AxiosError['config'] & {
  _adminAuthRetried?: boolean;
};

function isAdminApiRequest(url: string | undefined): boolean {
  return Boolean(url && /^\/api\/v1\/admin(?:\/|$)/.test(url));
}

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
    async (error: AxiosError) => {
      if (error.response && !isBaseApiResponse(error.response.data)) {
        error.response.data = createFallbackResponse(error);
      }

      const status = error.response?.status;
      const config = error.config as RetriableAdminRequestConfig;

      if (isAdminApiRequest(config?.url) && status === 401 && !config._adminAuthRetried) {
        config._adminAuthRetried = true;

        try {
          const accessToken = await getAdminAccessToken(true);
          config.headers.set('Authorization', `Bearer ${accessToken}`);
          return await axios.request(config);
        } catch {
          return Promise.reject(error);
        }
      }

      if (isAdminApiRequest(config?.url) && status === 401) {
        notifyAdminAuthFailure('unauthenticated');
      } else if (isAdminApiRequest(config?.url) && status === 403) {
        notifyAdminAuthFailure('forbidden');
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
