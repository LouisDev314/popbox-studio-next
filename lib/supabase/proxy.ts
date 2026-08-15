import {
  clearAuthCookiesAtScopes,
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveSupabasePublicConfig } from '@/configs/public-env';
import { REQUEST_PATH_HEADER } from '@/lib/auth/redirects';
import {
  evaluateAdminSessionPolicy,
  getSupabaseAuthStorageKey,
  type SessionPolicyClaims,
} from '@/lib/auth/session-policy';

type CookieToSet = { name: string; value: string; options: CookieOptions };

function isAdminPage(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isAdminApi(pathname: string): boolean {
  return pathname === '/api/v1/admin' || pathname.startsWith('/api/v1/admin/');
}

export async function refreshSupabaseSession(request: NextRequest) {
  const config = resolveSupabasePublicConfig();
  const pendingCookies: CookieToSet[] = [];
  const pendingHeaders = new Headers();
  const createPassThroughResponse = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };
  const finalizeResponse = (response: NextResponse) => {
    pendingCookies.forEach(({ name, options, value }) => {
      response.cookies.set(name, value, options);
    });
    pendingHeaders.forEach((value, name) => response.headers.set(name, value));
    return response;
  };
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
        Object.entries(headers).forEach(([name, value]) => pendingHeaders.set(name, value));
      },
    },
  });

  const claimsResult = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const adminPage = isAdminPage(pathname) && pathname !== '/admin/login';
  const adminApi = isAdminApi(pathname);

  if (!adminPage && !adminApi) {
    return finalizeResponse(createPassThroughResponse());
  }

  if (claimsResult.error && isAuthRetryableFetchError(claimsResult.error)) {
    if (adminApi) {
      return finalizeResponse(NextResponse.json(
        { status: 'error', code: 503, success: false, message: 'Authentication service unavailable.', data: null },
        { status: 503 },
      ));
    }

    return finalizeResponse(createPassThroughResponse());
  }

  const claims = claimsResult.data?.claims as SessionPolicyClaims | undefined;
  const policyStatus = claims ? evaluateAdminSessionPolicy(claims) : 'unverifiable';

  if (claimsResult.error || !claims || policyStatus !== 'valid') {
    await clearAuthCookiesAtScopes({
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      },
      scopes: [{ path: '/' }],
      storageKey: getSupabaseAuthStorageKey(config.url),
    });

    if (adminApi) {
      return finalizeResponse(NextResponse.json(
        { status: 'error', code: 401, success: false, message: 'Admin authentication required.', data: null },
        { status: 401 },
      ));
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = policyStatus === 'maximum-age-exceeded'
      ? '?reason=session-expired'
      : '?reason=unauthenticated';
    return finalizeResponse(NextResponse.redirect(loginUrl));
  }

  return finalizeResponse(createPassThroughResponse());
}
