import { screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountHeaderAction } from '@/components/layout/account-header-action';
import { CustomerAuthProvider } from '@/components/auth/customer-auth-provider';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import { renderWithProviders } from '../test-utils';

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));

const accountMocks = vi.hoisted(() => ({
  fetchAccountProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/products',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMocks }),
}));

vi.mock('@/configs/api/query-config', () => ({
  default: { fetchAccountProfile: accountMocks.fetchAccountProfile },
}));

vi.mock('@/utils/api-errors', () => ({
  getAccountApiErrorCode: () => 'CUSTOMER_ACCOUNT_REQUIRED',
}));

describe('storefront and admin identity separation', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
    authMocks.getUser.mockReset();
    authMocks.onAuthStateChange.mockReset();
    authMocks.signOut.mockReset();
    accountMocks.fetchAccountProfile.mockReset();
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'admin-session',
          user: {
            id: 'admin-user-id',
            email_confirmed_at: '2026-07-15T00:00:00Z',
            identities: [{ provider: 'email' }],
          },
        },
      },
      error: null,
    });
    authMocks.getUser.mockResolvedValue({
      data: {
        user: {
          email_confirmed_at: '2026-07-15T00:00:00Z',
          identities: [{ provider: 'email' }],
        },
      },
      error: null,
    });
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    accountMocks.fetchAccountProfile.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    });
  });

  it('keeps the account trigger in its loading shape during server rendering', () => {
    const html = renderToString(
      <AccountHeaderAction isMenuOpen={false} onMenuOpenChange={vi.fn()} />,
    );

    expect(html).toContain('aria-label="Checking account status"');
    expect(html).not.toContain('aria-label="Sign in or create an account"');
  });

  it('keeps the delayed mobile account menu in its loading shape during server rendering', () => {
    const html = renderToString(
      <MobileMenuPanel collectionNavItems={[]} isOpen={false} onNavigate={vi.fn()} />,
    );

    expect(html).toContain('aria-label="Checking account status"');
    expect(html).not.toContain('Sign In / Create Account');
  });

  it('treats an admin Supabase session as signed out in desktop and mobile storefront UI', async () => {
    renderWithProviders(
      <CustomerAuthProvider>
        <AccountHeaderAction isMenuOpen={false} onMenuOpenChange={vi.fn()} />
        <MobileMenuPanel collectionNavItems={[]} isOpen={true} onNavigate={vi.fn()} />
      </CustomerAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Sign in or create an account' })).toHaveAttribute(
        'href',
        '/account/sign-in?next=%2Fproducts',
      );
    });
    expect(screen.getByRole('link', { name: 'Sign In / Create Account' })).toHaveAttribute(
      'href',
      '/account/sign-in?next=%2Fproducts',
    );
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/admin"]')).not.toBeInTheDocument();
  });
});
