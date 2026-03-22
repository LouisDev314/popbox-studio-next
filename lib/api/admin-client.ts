import type { AxiosRequestConfig } from 'axios';
import { createClient } from '@/lib/supabase/client';

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function withAdminAuth(
  config: AxiosRequestConfig = {},
): Promise<AxiosRequestConfig> {
  const headers = await getAdminAuthHeaders();

  return {
    ...config,
    headers: {
      ...(config.headers ?? {}),
      ...headers,
    },
  };
}
