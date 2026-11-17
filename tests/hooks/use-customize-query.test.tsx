import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import useCustomizeQuery from '@/hooks/use-customize-query';

function createApiError(status: number) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    status,
    statusText: 'Request failed',
    data: { status: 'error', success: false, code: status, message: 'Request failed', data: null },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCustomizeQuery retry policy', () => {
  it.each([401, 403, 429])('does not retry status %s by default', async (status) => {
    const queryFn = vi.fn().mockRejectedValue(createApiError(status));
    const { result } = renderHook(() => useCustomizeQuery({ queryKey: ['retry', status], queryFn }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryFn).toHaveBeenCalledOnce();
  });

  it('retains bounded default retries for transient server failures', async () => {
    const queryFn = vi.fn().mockRejectedValue(createApiError(503));
    const { result } = renderHook(() => useCustomizeQuery({ queryKey: ['retry', 503], queryFn }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it('preserves an explicit numeric retry override for rate-limited reads', async () => {
    const queryFn = vi.fn().mockRejectedValue(createApiError(429));
    const { result } = renderHook(() => useCustomizeQuery({ queryKey: ['explicit-retry'], queryFn, retry: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('preserves an explicit disabled retry policy', async () => {
    const queryFn = vi.fn().mockRejectedValue(createApiError(503));
    const { result } = renderHook(() => useCustomizeQuery({ queryKey: ['no-retry'], queryFn, retry: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryFn).toHaveBeenCalledOnce();
  });
});
