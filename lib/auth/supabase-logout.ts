'use client';

import {
  clearAuthCookiesAtScopes,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabasePublicConfig } from '@/configs/public-env';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseAuthStorageKey } from '@/lib/auth/session-policy';

async function clearBrowserSupabaseAuthCookies(): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }

  const storageKey = getSupabaseAuthStorageKey(resolveSupabasePublicConfig().url);

  await clearAuthCookiesAtScopes({
    getAll: () => parseCookieHeader(document.cookie).map(({ name, value }) => ({
      name,
      value: value ?? '',
    })),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, options, value }) => {
        document.cookie = serializeCookieHeader(name, value, options);
      });
    },
    scopes: [{ path: '/' }],
    storageKey,
  });
}

export async function signOutSupabaseSession(
  supabase: SupabaseClient = createClient(),
): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The supported cookie cleanup below is the offline/network-failure fallback.
  } finally {
    try {
      await clearBrowserSupabaseAuthCookies();
    } catch {
      // Logout callers must still be able to replace navigation to a clean login screen.
    }
  }
}
