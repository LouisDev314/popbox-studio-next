import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckEmailPage from '@/app/(store)/account/(auth)/check-email/page';

const authMocks = vi.hoisted(() => ({
  redirectAuthenticatedAccountUser: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  redirectAuthenticatedAccountUser: authMocks.redirectAuthenticatedAccountUser,
}));

vi.mock('@/components/auth/auth-forms', () => ({
  CheckEmailState: ({ next }: { next: string }) => <span>waiting:{next}</span>,
}));

describe('check-email page', () => {
  beforeEach(() => {
    authMocks.redirectAuthenticatedAccountUser.mockReset();
    authMocks.redirectAuthenticatedAccountUser.mockResolvedValue(undefined);
  });

  it('checks server customer access before rendering the waiting state', async () => {
    render(await CheckEmailPage({
      searchParams: Promise.resolve({ next: '/account/orders' }),
    }));

    expect(authMocks.redirectAuthenticatedAccountUser).toHaveBeenCalledWith('/account/orders');
    expect(screen.getByText('waiting:/account/orders')).toBeVisible();
  });

  it('normalizes an unsafe destination before checking or rendering it', async () => {
    render(await CheckEmailPage({
      searchParams: Promise.resolve({ next: 'https://evil.example' }),
    }));

    expect(authMocks.redirectAuthenticatedAccountUser).toHaveBeenCalledWith('/account');
    expect(screen.getByText('waiting:/account')).toBeVisible();
  });
});
