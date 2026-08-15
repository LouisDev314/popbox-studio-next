import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signOutSupabaseSession } from '@/lib/auth/supabase-logout';

const ssrMocks = vi.hoisted(() => ({
  clearAuthCookiesAtScopes: vi.fn(),
  parseCookieHeader: vi.fn(() => []),
  serializeCookieHeader: vi.fn(() => ''),
}));

vi.mock('@supabase/ssr', () => ssrMocks);

vi.mock('@/configs/public-env', () => ({
  resolveSupabasePublicConfig: () => ({
    publishableKey: 'publishable-key',
    url: 'https://project-ref.supabase.co',
  }),
}));

describe('Supabase logout recovery', () => {
  beforeEach(() => {
    Object.values(ssrMocks).forEach((mock) => mock.mockClear());
    ssrMocks.clearAuthCookiesAtScopes.mockResolvedValue(undefined);
  });

  it('uses local Supabase sign-out and supported cookie cleanup', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    await signOutSupabaseSession({ auth: { signOut } } as never);

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(ssrMocks.clearAuthCookiesAtScopes).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: [{ path: '/' }],
        storageKey: 'sb-project-ref-auth-token',
      }),
    );
  });

  it('still clears local auth cookies when remote sign-out throws', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('Network Error'));

    await expect(signOutSupabaseSession({ auth: { signOut } } as never)).resolves.toBeUndefined();
    expect(ssrMocks.clearAuthCookiesAtScopes).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when no valid session exists or logout is repeated', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signOut } } as never;

    await signOutSupabaseSession(client);
    await signOutSupabaseSession(client);

    expect(signOut).toHaveBeenCalledTimes(2);
    expect(ssrMocks.clearAuthCookiesAtScopes).toHaveBeenCalledTimes(2);
  });
});
