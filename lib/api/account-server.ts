import 'server-only';

import axios, { type AxiosRequestConfig } from 'axios';
import getPublicEnvConfig from '@/configs/public-env';
import type {
  IAccountOrderListPage,
  IAccountProfile,
  ICustomerOrderDetail,
  IKujiHistoryPage,
} from '@/interfaces/account';
import type { IBaseApiResponse } from '@/interfaces/api-response';

const accountServerClient = axios.create({
  baseURL: getPublicEnvConfig().apiBaseUrl.replace(/\/$/, ''),
  headers: { Accept: 'application/json' },
  timeout: 15_000,
});

async function readAccountData<T>(path: string, token: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await accountServerClient.get<IBaseApiResponse<T>>(path, {
    ...config,
    headers: {
      ...config?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.data;
}

export function getAccountProfileServer(token: string): Promise<IAccountProfile> {
  return readAccountData('/api/v1/account/profile', token);
}

export function getAccountOrdersServer(token: string, cursor?: string): Promise<IAccountOrderListPage> {
  return readAccountData('/api/v1/account/orders', token, { params: { cursor, limit: 20 } });
}

export function getAccountOrderServer(token: string, publicId: string): Promise<ICustomerOrderDetail> {
  return readAccountData(`/api/v1/account/orders/${encodeURIComponent(publicId)}`, token);
}

export function getKujiHistoryServer(token: string, cursor?: string): Promise<IKujiHistoryPage> {
  return readAccountData('/api/v1/account/kuji-history', token, { params: { cursor, limit: 20 } });
}
