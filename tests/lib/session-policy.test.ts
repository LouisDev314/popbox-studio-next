import { describe, expect, it } from 'vitest';
import {
  ADMIN_MAX_SESSION_SECONDS,
  CUSTOMER_INACTIVITY_SECONDS,
  CUSTOMER_MAX_SESSION_SECONDS,
  evaluateAdminSessionPolicy,
  evaluateCustomerSessionPolicy,
} from '@/lib/auth/session-policy';

describe('session lifetime policy', () => {
  const nowSeconds = 2_000_000_000;

  it('keeps a customer session valid below both customer limits', () => {
    expect(evaluateCustomerSessionPolicy({
      authenticatedAtSeconds: nowSeconds - CUSTOMER_MAX_SESSION_SECONDS + 1,
      lastActivityAtSeconds: nowSeconds - CUSTOMER_INACTIVITY_SECONDS + 1,
      nowSeconds,
    })).toBe('valid');
  });

  it('requires fresh authentication at the 30-day inactivity boundary', () => {
    expect(evaluateCustomerSessionPolicy({
      authenticatedAtSeconds: nowSeconds - CUSTOMER_INACTIVITY_SECONDS,
      lastActivityAtSeconds: nowSeconds - CUSTOMER_INACTIVITY_SECONDS,
      nowSeconds,
    })).toBe('inactive');
  });

  it('requires fresh authentication at the 90-day absolute boundary', () => {
    expect(evaluateCustomerSessionPolicy({
      authenticatedAtSeconds: nowSeconds - CUSTOMER_MAX_SESSION_SECONDS,
      lastActivityAtSeconds: nowSeconds - 1,
      nowSeconds,
    })).toBe('maximum-age-exceeded');
  });

  it('accepts a verified admin authentication below 12 hours', () => {
    expect(evaluateAdminSessionPolicy({
      amr: [{ method: 'password', timestamp: nowSeconds - ADMIN_MAX_SESSION_SECONDS + 1 }],
      iat: nowSeconds - 10,
      session_id: 'admin-session',
    }, nowSeconds)).toBe('valid');
  });

  it('rejects a verified admin authentication at 12 hours despite token refreshes', () => {
    expect(evaluateAdminSessionPolicy({
      amr: [
        { method: 'password', timestamp: nowSeconds - ADMIN_MAX_SESSION_SECONDS },
        { method: 'token_refresh', timestamp: nowSeconds - 10 },
      ],
      iat: nowSeconds - 10,
      session_id: 'admin-session',
    }, nowSeconds)).toBe('maximum-age-exceeded');
  });

  it('fails closed when a trusted admin session timestamp cannot be established', () => {
    expect(evaluateAdminSessionPolicy({
      iat: nowSeconds,
      session_id: 'admin-session',
    }, nowSeconds)).toBe('unverifiable');
  });
});
