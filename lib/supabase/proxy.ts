import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveSupabasePublicConfig } from '@/configs/public-env';
import { REQUEST_PATH_HEADER } from '@/lib/auth/redirects';

export async function refreshSupabaseSession(request: NextRequest) {
  const config = resolveSupabasePublicConfig();
  const createResponse = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };
  let response = createResponse();
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = createResponse();
        cookiesToSet.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
