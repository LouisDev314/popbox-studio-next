'use client';

import { useMemo } from 'react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IShippingSettings } from '@/interfaces/shipping';
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizePublicShippingSettings,
} from '@/utils/shipping';

export const PUBLIC_SHIPPING_SETTINGS_QUERY_KEY = ['settings', 'shipping'] as const;

type PublicShippingSettingsSource = 'fallback' | 'loading' | 'remote';

export function usePublicShippingSettings(): {
  settings: IShippingSettings | null;
  source: PublicShippingSettingsSource;
  } {
  const query = useCustomizeQuery<IShippingSettings>({
    queryKey: PUBLIC_SHIPPING_SETTINGS_QUERY_KEY,
    queryFn: QueryConfigs.fetchPublicShippingSettings,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const responseSettings = query.data?.data.data;

  return useMemo(() => {
    if (responseSettings) {
      return {
        settings: normalizePublicShippingSettings(responseSettings),
        source: 'remote' as const,
      };
    }

    if (query.isError) {
      return {
        settings: { ...DEFAULT_SHIPPING_SETTINGS },
        source: 'fallback' as const,
      };
    }

    return {
      settings: null,
      source: 'loading' as const,
    };
  }, [query.isError, responseSettings]);
}
