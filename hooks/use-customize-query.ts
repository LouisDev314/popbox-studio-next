import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { AxiosError, AxiosResponse, HttpStatusCode } from 'axios';
import { useEffect } from 'react';
import { IBaseApiResponse } from '@/interfaces/api-response';

type QueryResponse<ApiResponse> = AxiosResponse<IBaseApiResponse<ApiResponse>>;
type QueryError = AxiosError<IBaseApiResponse<unknown>>;

interface ICustomizeQueryConfig<ApiResponse> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<QueryResponse<ApiResponse>>;
  retry?: boolean | number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean | 'always';
  placeholderData?: UseQueryOptions<
    QueryResponse<ApiResponse>,
    QueryError,
    QueryResponse<ApiResponse>,
    readonly unknown[]
  >['placeholderData'];
  onSuccess?: (data: QueryResponse<ApiResponse>) => void;
  onError?: (err: AxiosError<IBaseApiResponse>) => void;
}

function useCustomizeQuery<ApiResponse>(
  config: ICustomizeQueryConfig<ApiResponse>,
): UseQueryResult<QueryResponse<ApiResponse>, QueryError> {
  const { onSuccess, onError, ...queryConfig } = config;

  const queryResult = useQuery<
    QueryResponse<ApiResponse>,
    QueryError
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
    placeholderData: queryConfig.placeholderData,
  });

  useEffect(() => {
    if (queryResult.isSuccess && !queryResult.isPlaceholderData && onSuccess) {
      onSuccess(queryResult.data);
    }
  }, [queryResult.isSuccess, queryResult.isPlaceholderData, queryResult.data, onSuccess]);

  useEffect(() => {
    if (queryResult.isError && onError) {
      onError(queryResult.error as AxiosError<IBaseApiResponse>);
    }
  }, [queryResult.isError, queryResult.error, onError]);

  return queryResult;
}

export default useCustomizeQuery;
