import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import httpClient from '@/api/http-client';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { createClient } from '@/lib/supabase/client';

export type AdminProductKujiPrizeImageUploadResponse = {
  imageUrl: string;
};

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

export async function uploadAdminProductKujiPrizeImage(
  productId: string,
  file: File,
): Promise<AxiosResponse<IBaseApiResponse<AdminProductKujiPrizeImageUploadResponse>>> {
  const formData = new FormData();
  formData.append('file', file);

  return httpClient.post(
    `/api/v1/admin/products/${productId}/kuji-prizes/upload-image`,
    formData,
    await withAdminAuth(),
  );
}
