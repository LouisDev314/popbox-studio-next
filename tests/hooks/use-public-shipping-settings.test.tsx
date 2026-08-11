import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import QueryConfigs from '@/configs/api/query-config';
import {
  PUBLIC_SHIPPING_SETTINGS_QUERY_KEY,
  usePublicShippingSettings,
} from '@/hooks/use-public-shipping-settings';
import { DEFAULT_SHIPPING_SETTINGS } from '@/utils/shipping';

const remoteSettings = {
  flatShippingCents: 1299,
  calgaryFreeShippingThresholdCents: 7500,
  albertaFreeShippingThresholdCents: 8500,
  freeShippingThresholdCents: 14000,
  currency: 'CAD' as const,
};

function createApiResponse() {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data: remoteSettings,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function createUnauthorizedError() {
  return new AxiosError('Unauthorized', undefined, undefined, undefined, {
    data: {
      status: 'error',
      code: 401,
      success: false,
      message: 'Unauthorized',
      data: null,
    },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePublicShippingSettings', () => {
  it('returns amount-free loading state before the first response', () => {
    vi.spyOn(QueryConfigs, 'fetchPublicShippingSettings').mockReturnValue(new Promise(() => undefined));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => usePublicShippingSettings(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current).toEqual({ settings: null, source: 'loading' });
  });

  it('uses normalized remote settings after a successful request', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicShippingSettings').mockResolvedValue(createApiResponse());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => usePublicShippingSettings(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.source).toBe('remote'));
    expect(result.current.settings).toEqual(remoteSettings);
  });

  it('uses the complete fallback only after the initial request fails', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicShippingSettings').mockRejectedValue(createUnauthorizedError());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => usePublicShippingSettings(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.source).toBe('loading');
    await waitFor(() => expect(result.current.source).toBe('fallback'));
    expect(result.current.settings).toEqual(DEFAULT_SHIPPING_SETTINGS);
  });

  it('retains the last successful settings during a background refetch error', async () => {
    const fetchSettings = vi.spyOn(QueryConfigs, 'fetchPublicShippingSettings')
      .mockResolvedValueOnce(createApiResponse())
      .mockRejectedValue(createUnauthorizedError());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => usePublicShippingSettings(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.source).toBe('remote'));
    await queryClient.invalidateQueries({ queryKey: PUBLIC_SHIPPING_SETTINGS_QUERY_KEY });
    await waitFor(() => expect(fetchSettings).toHaveBeenCalledTimes(2));

    expect(result.current).toEqual({ settings: remoteSettings, source: 'remote' });
  });
});
