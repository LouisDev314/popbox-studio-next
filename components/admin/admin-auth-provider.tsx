'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session && !isLoginPage) {
        router.push('/admin/login');
      } else if (session && isLoginPage) {
        router.push('/admin/products');
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session && !isLoginPage) {
        router.push('/admin/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase.auth, isLoginPage]);

  // Prevent flash of unauthenticated content
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  // If we are on the login page, strip the sidebar and header
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F9FB]">
      <AdminSidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col md:ml-60">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
