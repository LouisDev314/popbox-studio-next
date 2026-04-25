import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthProvider } from '@/components/admin/admin-auth-provider';

const replace = vi.fn();
const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const usePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({
    replace,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
    },
  }),
}));

vi.mock('@/components/admin/admin-sidebar', () => ({
  AdminSidebar: () => <aside>Admin sidebar</aside>,
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="admin-toaster" />,
}));

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    replace.mockReset();
    getSession.mockReset();
    onAuthStateChange.mockReset();
    usePathname.mockReset();
    usePathname.mockReturnValue('/admin/settings/shipping');
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
        },
      },
    });
    onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  it('mounts one admin toaster when rendering an authenticated admin route', async () => {
    render(
      <AdminAuthProvider>
        <main>Shipping settings</main>
      </AdminAuthProvider>,
    );

    expect(await screen.findByText('Shipping settings')).toBeInTheDocument();
    expect(screen.getAllByTestId('admin-toaster')).toHaveLength(1);
  });
});
