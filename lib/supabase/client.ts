import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import getPublicEnvConfig from '@/configs/public-env';

let browserClient: SupabaseClient | undefined;

export function createClient() {
  browserClient ??= createBrowserClient(
    getPublicEnvConfig().supabaseUrl,
    getPublicEnvConfig().supabasePublicKey,
  );

  return browserClient;
}
