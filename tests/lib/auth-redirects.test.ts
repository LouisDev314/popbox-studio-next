import { describe, expect, it } from 'vitest';
import { validateInternalNext } from '@/lib/auth/redirects';

describe('validateInternalNext', () => {
  it.each([
    ['/account/orders', '/account/orders'],
    ['/account/reset-password', '/account/reset-password'],
    ['/products?type=kuji#stock', '/products?type=kuji#stock'],
    ['/cart', '/cart'],
  ])('preserves safe internal destinations', (value, expected) => {
    expect(validateInternalNext(value)).toBe(expected);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2F%2Fevil.example',
    '/admin',
    '/api/v1/account',
    '/_next/static/file.js',
    '/auth/callback?next=/account',
    '/account/sign-in?next=/account/orders',
    '/account/sign-up',
    '/account/check-email',
    '/account/forgot-password',
    '/account\u0000/orders',
  ])('rejects unsafe destination %s', (value) => {
    expect(validateInternalNext(value)).toBe('/account');
  });

  it('uses the supplied fallback for missing values', () => {
    expect(validateInternalNext(null, '/')).toBe('/');
  });
});
