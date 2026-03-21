import { createBrowserClient } from '@supabase/ssr';
import getEnvConfig from '@/configs/env';

export function createClient() {
  return createBrowserClient(
    getEnvConfig().supabaseUrl,
    getEnvConfig().supabasePublishableDefaultKey,
  );
}
