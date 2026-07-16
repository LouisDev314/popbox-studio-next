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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import type { IAccountProfile } from '@/interfaces/account';
import { createClient } from '@/lib/supabase/client';
import {
  accountProfileQueryKey,
  getAccountProfileQueryOptions,
} from '@/lib/auth/account-profile-query';
import { getAccountApiErrorCode } from '@/utils/api-errors';

export type CustomerAuthStatus =
  | 'resolving'
  | 'signedOut'
  | 'customer'
  | 'conflict'
  | 'unavailable';

interface ICustomerAuthValue {
  status: CustomerAuthStatus;
  isHydrated: boolean;
  session: Session | null;
  user: User | null;
  email: string | null;
  profile: IAccountProfile['profile'] | null;
  providers: string[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const CustomerAuthContext = createContext<ICustomerAuthValue | null>(null);
const FALLBACK_CUSTOMER_AUTH: ICustomerAuthValue = {
  status: 'signedOut',
  isHydrated: true,
  session: null,
  user: null,
  email: null,
  profile: null,
  providers: [],
  refresh: async () => undefined,
  signOut: async () => undefined,
};

function classifyProviderError(error: unknown): CustomerAuthStatus {
  const code = getAccountApiErrorCode(error);

  if (
    code === 'AUTH_REQUIRED'
    || code === 'AUTH_TOKEN_INVALID'
    || code === 'CUSTOMER_ACCOUNT_REQUIRED'
    || code === 'EMAIL_NOT_VERIFIED'
  ) {
    return 'signedOut';
  }

  if (code === 'ACCOUNT_OWNERSHIP_CONFLICT') {
    return 'conflict';
  }

  return 'unavailable';
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const activeUserIdRef = useRef<string | null>(null);
  const [authState, setAuthState] = useState<{
    isHydrated: boolean;
    session: Session | null;
  }>({ isHydrated: false, session: null });
  const user = authState.session?.user ?? null;
  const userId = user?.id ?? null;
  const canFetchProfile = Boolean(
    authState.isHydrated
    && authState.session?.access_token
    && userId
    && user?.email_confirmed_at,
  );
  const profileQuery = useQuery({
    ...getAccountProfileQueryOptions(userId ?? 'signed-out'),
    enabled: canFetchProfile,
  });

  const clearPrivateAccountQueries = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: ['account'] });
    queryClient.removeQueries({ queryKey: ['account'] });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    if (!canFetchProfile || !userId) {
      return;
    }

    await queryClient.invalidateQueries({
      exact: true,
      queryKey: accountProfileQueryKey(userId),
    });
  }, [canFetchProfile, queryClient, userId]);

  useEffect(() => {
    let isActive = true;
    let authEventGeneration = 0;
    const supabase = createClient();

    const applySession = (session: Session | null) => {
      if (!isActive) {
        return;
      }

      const nextUserId = session?.user.id ?? null;
      const previousUserId = activeUserIdRef.current;

      if (!nextUserId || (previousUserId && previousUserId !== nextUserId)) {
        clearPrivateAccountQueries();
      }

      activeUserIdRef.current = nextUserId;
      setAuthState({ isHydrated: true, session });
    };

    const initialAuthEventGeneration = authEventGeneration;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventGeneration += 1;
      applySession(session);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (authEventGeneration !== initialAuthEventGeneration) {
        return;
      }

      applySession(error ? null : data.session);
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [clearPrivateAccountQueries]);

  const signOut = useCallback(async () => {
    activeUserIdRef.current = null;
    setAuthState({ isHydrated: true, session: null });
    await queryClient.cancelQueries({ queryKey: ['account'] });
    queryClient.removeQueries({ queryKey: ['account'] });
    await createClient().auth.signOut({ scope: 'local' });
  }, [queryClient]);

  const accountProfile = profileQuery.data?.data.data ?? null;
  let status: CustomerAuthStatus = 'resolving';

  if (authState.isHydrated && !canFetchProfile) {
    status = 'signedOut';
  } else if (profileQuery.isSuccess) {
    status = 'customer';
  } else if (profileQuery.isError) {
    status = classifyProviderError(profileQuery.error);
  }

  const providers = useMemo(() => (
    status === 'customer'
      ? [...new Set((user?.identities ?? []).map((identity) => identity.provider))]
      : []
  ), [status, user?.identities]);

  const value = useMemo<ICustomerAuthValue>(() => ({
    status,
    isHydrated: authState.isHydrated,
    session: authState.session,
    user,
    email: accountProfile?.account.email ?? null,
    profile: accountProfile?.profile ?? null,
    providers,
    refresh,
    signOut,
  }), [
    accountProfile,
    authState.isHydrated,
    authState.session,
    providers,
    refresh,
    signOut,
    status,
    user,
  ]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): ICustomerAuthValue {
  return useContext(CustomerAuthContext) ?? FALLBACK_CUSTOMER_AUTH;
}
