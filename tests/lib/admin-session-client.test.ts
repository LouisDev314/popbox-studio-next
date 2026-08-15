import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import {
  ADMIN_AUTH_STATE_EVENT,
  AdminAuthenticationError,
  getAdminAccessToken,
} from '@/lib/auth/admin-session-client';
import { ADMIN_MAX_SESSION_SECONDS } from '@/lib/auth/session-policy';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMocks }),
}));

function accessToken(authenticatedAtSeconds: number) {
  const payload = btoa(JSON.stringify({
    amr: [{ method: 'password', timestamp: authenticatedAtSeconds }],
    iat: Math.floor(Date.now() / 1000),
    session_id: 'admin-session',
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function session(authenticatedAtSeconds = Math.floor(Date.now() / 1000)) {
  return { access_token: accessToken(authenticatedAtSeconds) };
}

describe('admin session client', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
    authMocks.refreshSession.mockReset();
  });

  it('returns a valid current admin token', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: session() }, error: null });

    await expect(getAdminAccessToken()).resolves.toMatch(/^header\./);
    expect(authMocks.refreshSession).not.toHaveBeenCalled();
  });

  it('uses Supabase refresh without treating normal JWT rotation as logout', async () => {
    authMocks.refreshSession.mockResolvedValue({ data: { session: session() }, error: null });

    await expect(getAdminAccessToken(true)).resolves.toMatch(/^header\./);
  });

  it('rejects an admin session beyond 12 hours and announces recovery', async () => {
    const reasons: string[] = [];
    window.addEventListener(ADMIN_AUTH_STATE_EVENT, (event) => {
      reasons.push((event as CustomEvent<string>).detail);
    }, { once: true });
    authMocks.getSession.mockResolvedValue({
      data: { session: session(Math.floor(Date.now() / 1000) - ADMIN_MAX_SESSION_SECONDS) },
      error: null,
    });

    await expect(getAdminAccessToken()).rejects.toMatchObject({
      name: 'AdminAuthenticationError',
      reason: 'session-expired',
    });
    expect(reasons).toEqual(['session-expired']);
  });

  it('turns an invalid refresh token into explicit unauthenticated state', async () => {
    authMocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid Refresh Token'),
    });

    await expect(getAdminAccessToken(true)).rejects.toEqual(
      expect.objectContaining<Partial<AdminAuthenticationError>>({ reason: 'unauthenticated' }),
    );
  });

  it('does not announce logout for a temporary refresh network failure', async () => {
    const reasons: string[] = [];
    window.addEventListener(ADMIN_AUTH_STATE_EVENT, (event) => {
      reasons.push((event as CustomEvent<string>).detail);
    }, { once: true });
    const retryableError = new AuthRetryableFetchError('Auth network unavailable', 0);
    authMocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: retryableError,
    });

    await expect(getAdminAccessToken(true)).rejects.toBe(retryableError);
    expect(reasons).toEqual([]);
  });
});
