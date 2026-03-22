import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AxiosError, AxiosResponse, HttpStatusCode } from 'axios';
import { useEffect } from 'react';
import { IBaseApiResponse } from '@/interfaces/api-response';

interface ICustomizeQueryConfig<ApiResponse> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<AxiosResponse<IBaseApiResponse<ApiResponse>>>;
  retry?: boolean | number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean | 'always';
  onSuccess?: (data: AxiosResponse<IBaseApiResponse<ApiResponse>>) => void;
  onError?: (err: AxiosError<IBaseApiResponse>) => void;
}

function useCustomizeQuery<ApiResponse>(
  config: ICustomizeQueryConfig<ApiResponse>,
): UseQueryResult<AxiosResponse<IBaseApiResponse<ApiResponse>>, AxiosError<IBaseApiResponse<unknown>>> {
  const { onSuccess, onError, ...queryConfig } = config;

  const queryResult = useQuery<
    AxiosResponse<IBaseApiResponse<ApiResponse>>,
    AxiosError<IBaseApiResponse<unknown>>
  >({
    queryKey: queryConfig.queryKey,
    queryFn: queryConfig.queryFn,
    retry: (failureCount, error) => {
      if (typeof queryConfig.retry === 'number') {
        return failureCount < queryConfig.retry;
      }

      if (typeof queryConfig.retry === 'boolean') {
        return queryConfig.retry;
      }

      const status = error.response?.status;

      if (status === HttpStatusCode.Unauthorized || status === HttpStatusCode.Forbidden) {
        return false;
      }

      return failureCount < 3;
    },
    enabled: queryConfig.enabled,
    staleTime: queryConfig.staleTime,
    gcTime: queryConfig.gcTime,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  });

  useEffect(() => {
    if (queryResult.isSuccess && onSuccess) {
      onSuccess(queryResult.data);
    }
  }, [queryResult.isSuccess, queryResult.data, onSuccess]);

  useEffect(() => {
    if (queryResult.isError && onError) {
      const err = queryResult.error;
      if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {

      } else if (err.code === HttpStatusCode.InternalServerError.toString()) {

      } else {
        onError(err);
      }
    }
  }, [queryResult.isError, queryResult.error, onError]);

  return queryResult;
}

export default useCustomizeQuery;
