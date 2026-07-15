const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const ENCODED_SLASH_OR_BACKSLASH_PATTERN = /%(?:2f|5c)/i;
const BLOCKED_PREFIXES = [
  '/admin',
  '/api',
  '/_next',
  '/auth/callback',
  '/account/sign-in',
  '/account/sign-up',
  '/account/check-email',
  '/account/forgot-password',
];

export function validateInternalNext(value: string | null | undefined, fallback = '/account'): string {
  const candidate = value?.trim();

  if (
    !candidate
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || CONTROL_CHARACTER_PATTERN.test(candidate)
    || ENCODED_SLASH_OR_BACKSLASH_PATTERN.test(candidate)
  ) {
    return fallback;
  }

  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(candidate.split(/[?#]/, 1)[0]).toLowerCase();
  } catch {
    return fallback;
  }

  if (BLOCKED_PREFIXES.some((prefix) => decodedPath === prefix || decodedPath.startsWith(`${prefix}/`))) {
    return fallback;
  }

  return candidate;
}

export function buildSignInHref(next: string): string {
  return `/account/sign-in?next=${encodeURIComponent(validateInternalNext(next))}`;
}
