import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import getEnvConfig from '@/configs/env';

let browserClient: SupabaseClient | undefined;

export function createClient() {
  browserClient ??= createBrowserClient(
    getEnvConfig().supabaseUrl,
    getEnvConfig().supabasePublishableDefaultKey,
  );

  return browserClient;
}
