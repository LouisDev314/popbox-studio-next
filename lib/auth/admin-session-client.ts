'use client';

import {
  isAuthRetryableFetchError,
  type Session,
} from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { evaluateAdminAccessToken } from '@/lib/auth/session-policy';

export const ADMIN_AUTH_STATE_EVENT = 'popbox:admin-auth-state';

export type AdminAuthFailureReason =
  | 'forbidden'
  | 'session-expired'
  | 'unauthenticated';

export class AdminAuthenticationError extends Error {
  readonly reason: Exclude<AdminAuthFailureReason, 'forbidden'>;

  constructor(reason: Exclude<AdminAuthFailureReason, 'forbidden'>) {
    super(reason === 'session-expired'
      ? 'Your admin session has expired. Sign in again to continue.'
      : 'Your admin session is no longer valid. Sign in again to continue.');
    this.name = 'AdminAuthenticationError';
    this.reason = reason;
  }
}

export function notifyAdminAuthFailure(reason: AdminAuthFailureReason): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<AdminAuthFailureReason>(ADMIN_AUTH_STATE_EVENT, {
    detail: reason,
  }));
}

export function validateAdminSession(session: Session | null): Session {
  if (!session?.access_token) {
    throw new AdminAuthenticationError('unauthenticated');
  }

  const policyStatus = evaluateAdminAccessToken(session.access_token);

  if (policyStatus !== 'valid') {
    throw new AdminAuthenticationError('session-expired');
  }

  return session;
}

export async function getAdminAccessToken(refresh = false): Promise<string> {
  const supabase = createClient();
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();

  if (result.error) {
    if (isAuthRetryableFetchError(result.error)) {
      throw result.error;
    }

    const error = new AdminAuthenticationError('unauthenticated');
    notifyAdminAuthFailure(error.reason);
    throw error;
  }

  try {
    return validateAdminSession(result.data.session).access_token;
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      notifyAdminAuthFailure(error.reason);
    }
    throw error;
  }
}
