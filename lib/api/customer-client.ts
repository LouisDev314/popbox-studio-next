'use client';

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import httpClient from '@/api/http-client';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import { createClient } from '@/lib/supabase/client';
import { getApiErrorCode } from '@/utils/api-errors';

export class CustomerAuthenticationError extends Error {
  constructor(message = 'Please sign in again to continue.') {
    super(message);
    this.name = 'CustomerAuthenticationError';
  }
}

async function getAccessToken(refresh = false): Promise<string> {
  const supabase = createClient();
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();
  const session = result.data.session;

  if (result.error || !session?.access_token) {
    throw new CustomerAuthenticationError();
  }

  return session.access_token;
}

function withBearer(config: AxiosRequestConfig | undefined, token: string): AxiosRequestConfig {
  return {
    ...config,
    headers: {
      ...config?.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function customerRequest<T>(
  request: (config: AxiosRequestConfig) => Promise<AxiosResponse<IBaseApiResponse<T>>>,
): Promise<AxiosResponse<IBaseApiResponse<T>>> {
  const token = await getAccessToken();

  try {
    return await request(withBearer(undefined, token));
  } catch (error) {
    if (
      !axios.isAxiosError(error)
      || error.response?.status !== 401
      || getApiErrorCode(error) !== 'AUTH_TOKEN_INVALID'
    ) {
      throw error;
    }

    const refreshedToken = await getAccessToken(true);
    return request(withBearer(undefined, refreshedToken));
  }
}

export function customerGet<T>(path: string, config?: AxiosRequestConfig) {
  return customerRequest<T>((authConfig) => httpClient.get(path, {
    ...config,
    headers: {
      ...config?.headers,
      ...authConfig.headers,
    },
  }));
}

export function customerPost<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
  return customerRequest<T>((authConfig) => httpClient.post(path, data, {
    ...config,
    headers: {
      ...config?.headers,
      ...authConfig.headers,
    },
  }));
}

export function customerPatch<T>(path: string, data: unknown, config?: AxiosRequestConfig) {
  return customerRequest<T>((authConfig) => httpClient.patch(path, data, {
    ...config,
    headers: {
      ...config?.headers,
      ...authConfig.headers,
    },
  }));
}
