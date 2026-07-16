import axios, { HttpStatusCode } from 'axios';
import { queryOptions } from '@tanstack/react-query';
import QueryConfigs from '@/configs/api/query-config';
import { CustomerAuthenticationError } from '@/lib/api/customer-client';

export const accountProfileQueryKey = (userId: string) => (
  ['account', 'profile', userId] as const
);

export function shouldRetryAccountProfileQuery(failureCount: number, error: unknown) {
  if (error instanceof CustomerAuthenticationError) {
    return false;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === HttpStatusCode.Unauthorized || status === HttpStatusCode.Forbidden) {
      return false;
    }
  }

  return failureCount < 2;
}

export function getAccountProfileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: accountProfileQueryKey(userId),
    queryFn: ({ signal }) => QueryConfigs.fetchAccountProfile({ signal }),
    retry: shouldRetryAccountProfileQuery,
    staleTime: 60 * 1000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
