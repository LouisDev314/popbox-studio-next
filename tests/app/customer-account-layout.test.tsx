import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestPath: '/account/orders/PBX-123',
  requireCustomerAccess: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-popbox-request-path': mocks.requestPath }),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  requireCustomerAccess: mocks.requireCustomerAccess,
}));

vi.mock('@/components/account/account-shell', () => ({
  AccountShell: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="account-shell">{children}</section>
  ),
}));

import CustomerAccountLayout from '@/app/(store)/account/(customer)/layout';

describe('protected customer account layout', () => {
  beforeEach(() => {
    mocks.requestPath = '/account/orders/PBX-123';
    mocks.requireCustomerAccess.mockReset();
  });

  it('checks customer access with the exact safe request path before rendering the shell', async () => {
    mocks.requireCustomerAccess.mockResolvedValue({ status: 'customer' });

    render(await CustomerAccountLayout({ children: <div>Protected content</div> }));

    expect(mocks.requireCustomerAccess).toHaveBeenCalledWith('/account/orders/PBX-123');
    expect(screen.getByTestId('account-shell')).toHaveTextContent('Protected content');
  });

  it('does not render the account shell when signed-out access redirects', async () => {
    mocks.requireCustomerAccess.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(CustomerAccountLayout({ children: <div>Protected content</div> })).rejects.toThrow('NEXT_REDIRECT');
    expect(screen.queryByTestId('account-shell')).not.toBeInTheDocument();
  });

  it('falls back safely instead of accepting an admin destination', async () => {
    mocks.requestPath = '/admin/orders';
    mocks.requireCustomerAccess.mockResolvedValue({ status: 'customer' });

    render(await CustomerAccountLayout({ children: <div>Protected content</div> }));

    expect(mocks.requireCustomerAccess).toHaveBeenCalledWith('/account');
  });
});
