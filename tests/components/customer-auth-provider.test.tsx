import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CustomerAuthProvider,
  useCustomerAuth,
} from '@/components/auth/customer-auth-provider';
import { renderWithProviders } from '../test-utils';

const authMocks = vi.hoisted(() => ({
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
  getAccountApiErrorCode: (error: unknown) => error instanceof Error ? error.message : null,
}));

function AuthStatus() {
  return <span>{useCustomerAuth().status}</span>;
}

describe('CustomerAuthProvider', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset());
    accountMocks.fetchAccountProfile.mockReset();
    authMocks.getUser.mockResolvedValue({
      data: {
        user: {
          email_confirmed_at: '2026-07-15T00:00:00Z',
          identities: [{ provider: 'email' }],
        },
      },
      error: null,
    });
    authMocks.signOut.mockResolvedValue({ error: null });
  });

  it('does not retain a stale EMAIL_NOT_VERIFIED classification after auth reconciliation', async () => {
    let authStateChanged: (() => void) | undefined;
    let rejectStaleProfile: ((error: Error) => void) | undefined;
    const staleProfile = new Promise((_, reject) => {
      rejectStaleProfile = reject;
    });
    accountMocks.fetchAccountProfile
      .mockReturnValueOnce(staleProfile)
      .mockResolvedValueOnce({
        data: {
          data: {
            account: { email: 'verified@example.com' },
            profile: { firstName: 'Verified', lastName: 'Customer' },
          },
        },
      });
    authMocks.onAuthStateChange.mockImplementation((callback: () => void) => {
      authStateChanged = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderWithProviders(
      <CustomerAuthProvider>
        <AuthStatus />
      </CustomerAuthProvider>,
    );

    await waitFor(() => expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1));
    act(() => authStateChanged?.());
    await waitFor(() => expect(screen.getByText('customer')).toBeVisible());

    await act(async () => {
      rejectStaleProfile?.(new Error('EMAIL_NOT_VERIFIED'));
      await staleProfile.catch(() => undefined);
    });

    expect(screen.getByText('customer')).toBeVisible();
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(2);
  });
});
