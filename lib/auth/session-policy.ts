export const ACCESS_TOKEN_TARGET_SECONDS = 60 * 60;
export const CUSTOMER_INACTIVITY_SECONDS = 30 * 24 * 60 * 60;
export const CUSTOMER_MAX_SESSION_SECONDS = 90 * 24 * 60 * 60;
export const ADMIN_MAX_SESSION_SECONDS = 12 * 60 * 60;

export function getSupabaseAuthStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

type AuthenticationMethod = {
  method: string;
  timestamp: number;
};

export type SessionPolicyClaims = {
  amr?: unknown;
  iat?: unknown;
  session_id?: unknown;
};

export type CustomerSessionPolicyStatus = 'valid' | 'inactive' | 'maximum-age-exceeded';
export type AdminSessionPolicyStatus = 'valid' | 'maximum-age-exceeded' | 'unverifiable';

function isAuthenticationMethod(value: unknown): value is AuthenticationMethod {
  return Boolean(
    value
    && typeof value === 'object'
    && 'method' in value
    && typeof value.method === 'string'
    && 'timestamp' in value
    && typeof value.timestamp === 'number'
    && Number.isFinite(value.timestamp),
  );
}

export function getAuthenticationTimeSeconds(claims: SessionPolicyClaims): number | null {
  if (!Array.isArray(claims.amr)) {
    return null;
  }

  const authenticationTimes = claims.amr
    .filter(isAuthenticationMethod)
    .filter(({ method }) => method !== 'token_refresh')
    .map(({ timestamp }) => timestamp);

  return authenticationTimes.length > 0 ? Math.min(...authenticationTimes) : null;
}

export function evaluateCustomerSessionPolicy(input: {
  authenticatedAtSeconds: number;
  lastActivityAtSeconds: number;
  nowSeconds: number;
}): CustomerSessionPolicyStatus {
  if (input.nowSeconds - input.authenticatedAtSeconds >= CUSTOMER_MAX_SESSION_SECONDS) {
    return 'maximum-age-exceeded';
  }

  if (input.nowSeconds - input.lastActivityAtSeconds >= CUSTOMER_INACTIVITY_SECONDS) {
    return 'inactive';
  }

  return 'valid';
}

export function evaluateAdminSessionPolicy(
  claims: SessionPolicyClaims,
  nowSeconds = Math.floor(Date.now() / 1000),
): AdminSessionPolicyStatus {
  const authenticatedAtSeconds = getAuthenticationTimeSeconds(claims);

  if (authenticatedAtSeconds === null || typeof claims.session_id !== 'string') {
    return 'unverifiable';
  }

  return nowSeconds - authenticatedAtSeconds >= ADMIN_MAX_SESSION_SECONDS
    ? 'maximum-age-exceeded'
    : 'valid';
}

export function decodeSessionPolicyClaims(accessToken: string): SessionPolicyClaims | null {
  const payload = accessToken.split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4),
      '=',
    );
    const decodedPayload = atob(paddedPayload);
    const claims = JSON.parse(decodedPayload) as unknown;

    return claims && typeof claims === 'object' ? claims as SessionPolicyClaims : null;
  } catch {
    return null;
  }
}

export function evaluateAdminAccessToken(
  accessToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): AdminSessionPolicyStatus {
  const claims = decodeSessionPolicyClaims(accessToken);
  return claims ? evaluateAdminSessionPolicy(claims, nowSeconds) : 'unverifiable';
}
