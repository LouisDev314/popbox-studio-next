import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountHeaderAction } from '@/components/layout/account-header-action';
import { CustomerAuthProvider } from '@/components/auth/customer-auth-provider';
import { MobileMenuPanel } from '@/components/layout/mobile-menu-panel';
import { renderWithProviders } from '../test-utils';

const authMocks = vi.hoisted(() => ({
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
    authMocks.onAuthStateChange.mockReset();
    authMocks.signOut.mockReset();
    accountMocks.fetchAccountProfile.mockReset();
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'admin-session',
          user: { identities: [{ provider: 'email' }] },
        },
      },
      error: null,
    });
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    accountMocks.fetchAccountProfile.mockRejectedValue(new Error('CUSTOMER_ACCOUNT_REQUIRED'));
  });

  it('treats an admin Supabase session as signed out in desktop and mobile storefront UI', async () => {
    renderWithProviders(
      <CustomerAuthProvider>
        <AccountHeaderAction />
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
