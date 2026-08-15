import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSupabaseSession } from '@/lib/supabase/proxy';
import { ADMIN_MAX_SESSION_SECONDS } from '@/lib/auth/session-policy';

const supabaseMocks = vi.hoisted(() => ({
  clearAuthCookiesAtScopes: vi.fn(),
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', async (importOriginal) => ({
  ...await importOriginal<typeof import('@supabase/ssr')>(),
  clearAuthCookiesAtScopes: supabaseMocks.clearAuthCookiesAtScopes,
  createServerClient: supabaseMocks.createServerClient,
}));

vi.mock('@/configs/public-env', () => ({
  resolveSupabasePublicConfig: () => ({
    publishableKey: 'publishable-key',
    url: 'https://project-ref.supabase.co',
  }),
}));

function verifiedClaims(authenticatedAtSeconds = Math.floor(Date.now() / 1000)) {
  return {
    amr: [{ method: 'password', timestamp: authenticatedAtSeconds }],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    session_id: 'admin-session',
    sub: 'admin-user',
  };
}

describe('Supabase admin proxy guard', () => {
  beforeEach(() => {
    supabaseMocks.clearAuthCookiesAtScopes.mockReset();
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.getClaims.mockReset();
    supabaseMocks.clearAuthCookiesAtScopes.mockImplementation(async ({ setAll }) => {
      await setAll([{ name: 'sb-project-ref-auth-token', value: '', options: { maxAge: 0 } }], {});
    });
    supabaseMocks.createServerClient.mockReturnValue({
      auth: { getClaims: supabaseMocks.getClaims },
    });
  });

  it('allows a protected admin route with a verified session below 12 hours', async () => {
    supabaseMocks.getClaims.mockResolvedValue({
      data: { claims: verifiedClaims() },
      error: null,
    });

    const response = await refreshSupabaseSession(
      new NextRequest('https://store.example.com/admin/products'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(supabaseMocks.clearAuthCookiesAtScopes).not.toHaveBeenCalled();
  });

  it('rejects an admin API request server-side beyond the 12-hour maximum', async () => {
    supabaseMocks.getClaims.mockResolvedValue({
      data: {
        claims: verifiedClaims(
          Math.floor(Date.now() / 1000) - ADMIN_MAX_SESSION_SECONDS,
        ),
      },
      error: null,
    });

    const response = await refreshSupabaseSession(
      new NextRequest('https://store.example.com/api/v1/admin/products'),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Admin authentication required.',
    });
    expect(supabaseMocks.clearAuthCookiesAtScopes).toHaveBeenCalledTimes(1);
  });

  it('redirects a stale admin page to login and clears its cookie', async () => {
    supabaseMocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    const response = await refreshSupabaseSession(
      new NextRequest('https://store.example.com/admin/orders'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://store.example.com/admin/login?reason=unauthenticated',
    );
    expect(response.cookies.get('sb-project-ref-auth-token')?.value).toBe('');
  });

  it('keeps the admin login route reachable without a session', async () => {
    supabaseMocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    const response = await refreshSupabaseSession(
      new NextRequest('https://store.example.com/admin/login'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
