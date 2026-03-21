'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Admin landing page — redirects to the products list or login.
 */
export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        router.replace('/admin/products');
      } else {
        router.replace('/admin/login');
      }
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase.auth]);

  return null;
}
