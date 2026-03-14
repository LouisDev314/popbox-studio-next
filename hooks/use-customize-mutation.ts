import { IBaseApiResponse } from '@/interfaces/api-response';
import { MutationFunction, useMutation } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';

interface ICustomizeMutationConfig<ApiResponse, ApiRequest> {
  mutationFn: MutationFunction<AxiosResponse<IBaseApiResponse<ApiResponse>>, ApiRequest>;
  retry?: boolean | number;
  onError?: (err: AxiosError<IBaseApiResponse>) => void;
  onSuccess?: (data: AxiosResponse<IBaseApiResponse<ApiResponse>, unknown>) => void;
  onSettled?: (data: AxiosResponse<IBaseApiResponse<ApiResponse>, unknown> | undefined, error: AxiosError<IBaseApiResponse> | null, variables: ApiRequest, context: unknown) => void;
}

const useCustomizeMutation = <ApiResponse, ApiRequest>(config: ICustomizeMutationConfig<ApiResponse, ApiRequest>) => {
  const { onSuccess, onError, ...mutationConfig } = config;
  const mutation = useMutation<AxiosResponse<IBaseApiResponse<ApiResponse>>, AxiosError, ApiRequest>({
    mutationFn: mutationConfig.mutationFn,
    retry: mutationConfig.retry,
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (err) => {
      if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {

      } else {
        onError?.(err as AxiosError<IBaseApiResponse>);
      }
    },
    onSettled: (data, error, variables, context) => {
      mutationConfig.onSettled?.(data, error as AxiosError<IBaseApiResponse>, variables, context);
    },
  });

  return {
    mutation: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
};

export default useCustomizeMutation;
