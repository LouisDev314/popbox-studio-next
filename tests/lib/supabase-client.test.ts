import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: supabaseMocks.createBrowserClient,
}));

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    supabasePublishableKey: 'publishable-key',
    supabaseUrl: 'https://project.supabase.co',
  }),
  resolveSupabasePublicConfig: () => ({
    publishableKey: 'publishable-key',
    url: 'https://project.supabase.co',
  }),
}));

describe('Supabase browser client', () => {
  beforeEach(() => {
    supabaseMocks.createBrowserClient.mockReset();
  });

  it('creates one browser client and reuses it for every caller', async () => {
    const browserClient = { auth: {} };
    supabaseMocks.createBrowserClient.mockReturnValue(browserClient);
    const { createClient } = await import('@/lib/supabase/client');

    expect(createClient()).toBe(browserClient);
    expect(createClient()).toBe(browserClient);
    expect(supabaseMocks.createBrowserClient).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.createBrowserClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      },
    );
  });
});
