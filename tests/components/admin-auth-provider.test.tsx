import { type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { AdminAuthProvider } from '@/components/admin/admin-auth-provider';
import { ADMIN_AUTH_STATE_EVENT } from '@/lib/auth/admin-session-client';

const replace = vi.fn();
const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const usePathname = vi.fn();
const signOutSupabaseSession = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ replace }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));

vi.mock('@/lib/auth/supabase-logout', () => ({
  signOutSupabaseSession: (...args: unknown[]) => signOutSupabaseSession(...args),
}));

vi.mock('@/components/admin/admin-sidebar', () => ({
  AdminSidebar: (props: { isSigningOut: boolean; onLogout: () => void }) => (
    <aside>
      Admin sidebar
      <button disabled={props.isSigningOut} onClick={props.onLogout} type="button">Sign out</button>
    </aside>
  ),
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="admin-toaster" />,
}));

function accessToken(authenticatedAtSeconds = Math.floor(Date.now() / 1000)) {
  const payload = btoa(JSON.stringify({
    amr: [{ method: 'password', timestamp: authenticatedAtSeconds }],
    iat: Math.floor(Date.now() / 1000),
    session_id: 'admin-session',
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function adminSession(authenticatedAtSeconds?: number) {
  return { access_token: accessToken(authenticatedAtSeconds) };
}

function renderProvider(children: ReactNode = <main>Shipping settings</main>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    replace.mockReset();
    getSession.mockReset();
    onAuthStateChange.mockReset();
    usePathname.mockReset();
    signOutSupabaseSession.mockReset();
    usePathname.mockReturnValue('/admin/settings/shipping');
    getSession.mockResolvedValue({ data: { session: adminSession() }, error: null });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signOutSupabaseSession.mockResolvedValue(undefined);
  });

  it('renders a valid admin session below the 12-hour limit', async () => {
    renderProvider();

    expect(await screen.findByText('Shipping settings')).toBeInTheDocument();
    expect(screen.getAllByTestId('admin-toaster')).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps logout available during a retryable Supabase Auth outage', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Auth network unavailable', 0),
    });
    renderProvider();

    expect(await screen.findByText('Shipping settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
    expect(signOutSupabaseSession).not.toHaveBeenCalled();
  });

  it('rejects an expired admin session and redirects to a fresh login', async () => {
    getSession.mockResolvedValue({
      data: { session: adminSession(Math.floor(Date.now() / 1000) - 12 * 60 * 60) },
      error: null,
    });
    renderProvider();

    await waitFor(() => expect(signOutSupabaseSession).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/admin/login?reason=session-expired');
    expect(screen.queryByText('Shipping settings')).not.toBeInTheDocument();
  });

  it('clears auth-sensitive caches and logs out from a stale rendered shell', async () => {
    const { queryClient } = renderProvider();
    queryClient.setQueryData(['admin', 'products'], { private: true });
    queryClient.setQueryData(['account', 'profile'], { private: true });
    queryClient.setQueryData(['products'], { public: true });
    await screen.findByText('Shipping settings');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login?reason=unauthenticated'));
    expect(signOutSupabaseSession).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['admin', 'products'])).toBeUndefined();
    expect(queryClient.getQueryData(['account', 'profile'])).toBeUndefined();
    expect(queryClient.getQueryData(['products'])).toEqual({ public: true });
  });

  it('transitions an unrecoverable 401 signal to logged out state', async () => {
    renderProvider();
    await screen.findByText('Shipping settings');

    window.dispatchEvent(new CustomEvent(ADMIN_AUTH_STATE_EVENT, { detail: 'unauthenticated' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login?reason=unauthenticated'));
    expect(signOutSupabaseSession).toHaveBeenCalledTimes(1);
  });

  it('handles a 403 as admin authorization loss without destroying customer auth', async () => {
    const { queryClient } = renderProvider();
    queryClient.setQueryData(['admin', 'products'], { private: true });
    queryClient.setQueryData(['account', 'profile'], { customer: true });
    await screen.findByText('Shipping settings');

    window.dispatchEvent(new CustomEvent(ADMIN_AUTH_STATE_EVENT, { detail: 'forbidden' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login?reason=forbidden'));
    expect(signOutSupabaseSession).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['admin', 'products'])).toBeUndefined();
    expect(queryClient.getQueryData(['account', 'profile'])).toEqual({ customer: true });
  });

  it('keeps the login page usable even when a stale Supabase session exists', async () => {
    usePathname.mockReturnValue('/admin/login');
    renderProvider(<main>Admin Login</main>);

    expect(await screen.findByText('Admin Login')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith('/admin/products');
  });

  it('makes repeated logout calls idempotent while recovery is in flight', async () => {
    let finishLogout: (() => void) | undefined;
    signOutSupabaseSession.mockReturnValue(new Promise<void>((resolve) => {
      finishLogout = resolve;
    }));
    renderProvider();
    await screen.findByText('Shipping settings');

    const logout = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(logout);
    fireEvent.click(logout);

    await waitFor(() => expect(signOutSupabaseSession).toHaveBeenCalledTimes(1));
    finishLogout?.();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });
});
