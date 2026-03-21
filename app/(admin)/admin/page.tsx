'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Admin landing page — redirects to the products list or login.
 */
export default function AdminPage() {
  const router = useRouter();
  const supabase = typeof window === 'undefined' ? null : createClient();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;

      router.replace(session ? '/admin/products' : '/admin/login');
    });

    return () => {
      isActive = false;
    };
  }, [router, supabase]);

  return null;
}
