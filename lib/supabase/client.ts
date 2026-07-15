import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import getPublicEnvConfig, { resolveSupabasePublicConfig } from '@/configs/public-env';

let browserClient: SupabaseClient | undefined;

export function createClient() {
  const publicEnv = getPublicEnvConfig();
  const config = resolveSupabasePublicConfig({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicEnv.supabasePublishableKey,
    NEXT_PUBLIC_SUPABASE_URL: publicEnv.supabaseUrl,
  });

  browserClient ??= createBrowserClient(
    config.url,
    config.publishableKey,
  );

  return browserClient;
}
