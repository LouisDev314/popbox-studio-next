'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
    </div>
  );
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [resolvedPathname, setResolvedPathname] = useState<string | null>(null);
  const [supabase] = useState(() => (
    typeof window === 'undefined' ? null : createClient()
  ));
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isLoading = resolvedPathname !== pathname;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    const resolveSession = (session: Session | null) => {
      if (!isActive) {
        return;
      }

      if (!session && !isLoginPage) {
        setResolvedPathname(null);
        router.replace('/admin/login');
        return;
      }

      if (session && isLoginPage) {
        setResolvedPathname(null);
        router.replace('/admin/products');
        return;
      }

      setResolvedPathname(pathname);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, pathname, router, supabase]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F9FB]">
      <AdminSidebar />

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
