import { StrictMode, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CustomerAuthProvider,
  useCustomerAuth,
} from '@/components/auth/customer-auth-provider';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));

const accountMocks = vi.hoisted(() => ({
  fetchAccountProfile: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMocks }),
}));

vi.mock('@/configs/api/query-config', () => ({
  default: { fetchAccountProfile: accountMocks.fetchAccountProfile },
}));

vi.mock('@/utils/api-errors', () => ({
  getAccountApiErrorCode: (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object' && 'accountCode' in error) {
      return error.accountCode;
    }

    return null;
  },
}));

type AuthStateCallback = (event: string, session: ReturnType<typeof createSession> | null) => void;

function createSession(accessToken = 'current-access-token') {
  return {
    access_token: accessToken,
    user: {
      id: 'customer-user-id',
      email: 'customer@example.com',
      email_confirmed_at: '2026-07-15T00:00:00Z',
      identities: [{ provider: 'email' }],
    },
  };
}

function profileResponse() {
  return {
    data: {
      data: {
        account: { email: 'customer@example.com' },
        profile: { firstName: 'Pop', lastName: 'Box' },
      },
    },
  };
}

function AuthState() {
  const auth = useCustomerAuth();

  return (
    <div>
      <span data-testid="auth-status">{auth.status}</span>
      <span data-testid="hydrated">{String(auth.isHydrated)}</span>
      <span data-testid="access-token">{auth.session?.access_token ?? 'none'}</span>
      <button type="button" onClick={() => void auth.signOut()}>Sign out</button>
    </div>
  );
}

function renderAuthProvider(
  children: ReactNode = <AuthState />,
  wrapper: (children: ReactNode) => ReactNode = (value) => value,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
    },
  });
  const tree = (
    <QueryClientProvider client={queryClient}>
      <CustomerAuthProvider>
        {children}
      </CustomerAuthProvider>
    </QueryClientProvider>
  );
  const result = render(<>{wrapper(tree)}</>);

  return { ...result, queryClient };
}

function authenticationError(status: 401 | 403) {
  return {
    accountCode: status === 401 ? 'AUTH_TOKEN_INVALID' : 'EMAIL_NOT_VERIFIED',
    isAxiosError: true,
    response: { status },
  };
}

describe('CustomerAuthProvider', () => {
  let authStateChanged: AuthStateCallback | undefined;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset());
    accountMocks.fetchAccountProfile.mockReset();
    authStateChanged = undefined;
    unsubscribe = vi.fn();
    authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    authMocks.onAuthStateChange.mockImplementation((callback: AuthStateCallback) => {
      authStateChanged = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    authMocks.signOut.mockResolvedValue({ error: null });
    accountMocks.fetchAccountProfile.mockResolvedValue(profileResponse());
  });

  it('settles signed-out hydration without getUser or an account profile request', async () => {
    renderAuthProvider();

    expect(screen.getByTestId('auth-status')).toHaveTextContent('resolving');
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('signedOut'));

    act(() => authStateChanged?.('INITIAL_SESSION', null));
    fireEvent.focus(window);
    window.dispatchEvent(new Event('online'));

    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(authMocks.getUser).not.toHaveBeenCalled();
    expect(accountMocks.fetchAccountProfile).not.toHaveBeenCalled();
  });

  it('does not fetch the profile while initial auth hydration is unresolved', async () => {
    let resolveSession: ((result: { data: { session: null }; error: null }) => void) | undefined;
    authMocks.getSession.mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));
    renderAuthProvider();

    expect(screen.getByTestId('hydrated')).toHaveTextContent('false');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('resolving');
    expect(accountMocks.fetchAccountProfile).not.toHaveBeenCalled();

    await act(async () => resolveSession?.({ data: { session: null }, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('signedOut'));
    expect(accountMocks.fetchAccountProfile).not.toHaveBeenCalled();
  });

  it('fetches the profile once after an authenticated session resolves', async () => {
    const session = createSession();
    authMocks.getSession.mockResolvedValue({ data: { session }, error: null });
    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('customer'));
    act(() => authStateChanged?.('INITIAL_SESSION', session));

    await waitFor(() => expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1));
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
    expect(authMocks.getUser).not.toHaveBeenCalled();
  });

  it.each([401, 403] as const)('does not retry a profile %s response', async (status) => {
    authMocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    accountMocks.fetchAccountProfile.mockRejectedValue(authenticationError(status));
    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('signedOut'));
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1);
  });

  it('cancels and removes private cache before logout without starting another profile request', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    const { queryClient } = renderAuthProvider();
    queryClient.setQueryData(['account', 'orders'], { private: true });
    queryClient.setQueryData(['products'], { public: true });
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries');

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('customer'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ['account'] });
    expect(queryClient.getQueryData(['account', 'orders'])).toBeUndefined();
    expect(queryClient.getQueryData(['account', 'profile', 'customer-user-id'])).toBeUndefined();
    expect(queryClient.getQueryData(['products'])).toEqual({ public: true });

    act(() => authStateChanged?.('SIGNED_OUT', null));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('signedOut');
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1);
  });

  it('keeps one active auth listener through Strict Mode setup and cleans it up', async () => {
    const activeListeners = new Set<AuthStateCallback>();
    authMocks.onAuthStateChange.mockImplementation((callback: AuthStateCallback) => {
      activeListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(() => activeListeners.delete(callback)),
          },
        },
      };
    });

    const { unmount } = renderAuthProvider(
      <AuthState />,
      (children) => <StrictMode>{children}</StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('signedOut'));

    expect(authMocks.onAuthStateChange).toHaveBeenCalledTimes(2);
    expect(activeListeners.size).toBe(1);

    unmount();
    expect(activeListeners.size).toBe(0);
  });

  it('updates the in-memory session on token refresh without refetching the profile', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: createSession() }, error: null });
    renderAuthProvider();
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('customer'));

    act(() => authStateChanged?.('TOKEN_REFRESHED', createSession('refreshed-access-token')));

    expect(screen.getByTestId('access-token')).toHaveTextContent('refreshed-access-token');
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1);
    expect(authMocks.getUser).not.toHaveBeenCalled();
  });
});
