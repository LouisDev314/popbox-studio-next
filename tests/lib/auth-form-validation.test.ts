import { describe, expect, it } from 'vitest';
import {
  credentialsAuthFormSchema,
  getCustomerAuthErrorMessage,
  getPasswordRequirements,
  passwordAuthFormSchema,
} from '@/lib/auth/form-validation';

describe('customer auth validation', () => {
  it('enforces the exact storefront password policy', () => {
    expect(passwordAuthFormSchema.safeParse({ password: 'short1' }).success).toBe(false);
    expect(passwordAuthFormSchema.safeParse({ password: '12345678' }).success).toBe(false);
    expect(passwordAuthFormSchema.safeParse({ password: 'abcdefgh' }).success).toBe(false);
    expect(passwordAuthFormSchema.safeParse({ password: 'abc12345' }).success).toBe(true);
  });

  it('has no confirm-password field or matching-password validation', () => {
    expect(credentialsAuthFormSchema.keyof().options).toEqual(['email', 'password']);
    expect(passwordAuthFormSchema.keyof().options).toEqual(['password']);
  });

  it('reports password checklist requirements independently', () => {
    expect(getPasswordRequirements('abc123')).toEqual({
      hasLetter: true,
      hasMinimumLength: false,
      hasNumber: true,
    });
    expect(getPasswordRequirements('abcdefgh')).toEqual({
      hasLetter: true,
      hasMinimumLength: true,
      hasNumber: false,
    });
    expect(getPasswordRequirements('12345678')).toEqual({
      hasLetter: false,
      hasMinimumLength: true,
      hasNumber: true,
    });
  });
});

describe('customer-safe Supabase errors', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'raw credentials detail' }, 'signIn', 'Email or password is incorrect.'],
    [{ code: 'email_not_confirmed', message: 'raw confirmation detail' }, 'signIn', 'Confirm your email before signing in.'],
    [{ code: 'user_already_exists', message: 'raw duplicate detail' }, 'signUp', 'An account with this email already exists. Try signing in instead.'],
    [{ code: 'over_request_rate_limit', message: 'raw rate detail', status: 429 }, 'signUp', 'Too many attempts. Please wait a moment and try again.'],
    [{ code: 'unexpected', message: 'sensitive provider detail', status: 503 }, 'passwordUpdate', 'We could not update your password. Request a new reset link and try again.'],
  ] as const)('maps provider errors without exposing raw messages', (error, context, expected) => {
    const message = getCustomerAuthErrorMessage(error, context);
    expect(message).toBe(expected);
    expect(message).not.toContain(error.message);
  });
});
