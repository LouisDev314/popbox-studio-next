'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IAccountProfile } from '@/interfaces/account';
import { createClient } from '@/lib/supabase/client';
import QueryConfigs from '@/configs/api/query-config';
import { getAccountApiErrorCode } from '@/utils/api-errors';

export type CustomerAuthStatus =
  | 'resolving'
  | 'signedOut'
  | 'customer'
  | 'conflict'
  | 'unavailable';

interface ICustomerAuthValue {
  status: CustomerAuthStatus;
  email: string | null;
  profile: IAccountProfile['profile'] | null;
  providers: string[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const CustomerAuthContext = createContext<ICustomerAuthValue | null>(null);
const FALLBACK_CUSTOMER_AUTH: ICustomerAuthValue = {
  status: 'signedOut',
  email: null,
  profile: null,
  providers: [],
  refresh: async () => undefined,
  signOut: async () => undefined,
};

function classifyProviderError(error: unknown): CustomerAuthStatus {
  const code = getAccountApiErrorCode(error);

  if (code === 'CUSTOMER_ACCOUNT_REQUIRED' || code === 'EMAIL_NOT_VERIFIED') {
    return 'signedOut';
  }

  if (code === 'ACCOUNT_OWNERSHIP_CONFLICT') {
    return 'conflict';
  }

  return 'unavailable';
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const refreshGenerationRef = useRef(0);
  const [status, setStatus] = useState<CustomerAuthStatus>('resolving');
  const [profile, setProfile] = useState<IAccountProfile | null>(null);
  const [providers, setProviders] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const refreshGeneration = ++refreshGenerationRef.current;
    const supabase = createClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!mountedRef.current || refreshGeneration !== refreshGenerationRef.current) {
      return;
    }

    if (userResult.error || !user?.email_confirmed_at) {
      setProfile(null);
      setProviders([]);
      setStatus('signedOut');
      return;
    }

    setProviders([...new Set((user.identities ?? []).map((identity) => identity.provider))]);

    try {
      await queryClient.invalidateQueries({ queryKey: ['account'] });
      const response = await QueryConfigs.fetchAccountProfile();
      if (!mountedRef.current || refreshGeneration !== refreshGenerationRef.current) {
        return;
      }

      setProfile(response.data.data);
      setStatus('customer');
    } catch (error) {
      if (!mountedRef.current || refreshGeneration !== refreshGenerationRef.current) {
        return;
      }

      setProfile(null);
      setProviders([]);
      setStatus(classifyProviderError(error));
    }
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    const initialRefreshTimeout = window.setTimeout(() => void refresh(), 0);

    const { data: authListener } = createClient().auth.onAuthStateChange(() => {
      queueMicrotask(() => {
        void queryClient.invalidateQueries({ queryKey: ['account'] });
        void refresh();
      });
    });

    return () => {
      mountedRef.current = false;
      refreshGenerationRef.current += 1;
      window.clearTimeout(initialRefreshTimeout);
      authListener.subscription.unsubscribe();
    };
  }, [queryClient, refresh]);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut({ scope: 'local' });
    queryClient.removeQueries({ queryKey: ['account'] });
    setProfile(null);
    setProviders([]);
    setStatus('signedOut');
  }, [queryClient]);

  const value = useMemo<ICustomerAuthValue>(() => ({
    status,
    email: profile?.account.email ?? null,
    profile: profile?.profile ?? null,
    providers,
    refresh,
    signOut,
  }), [profile, providers, refresh, signOut, status]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): ICustomerAuthValue {
  return useContext(CustomerAuthContext) ?? FALLBACK_CUSTOMER_AUTH;
}
