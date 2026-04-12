'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { ADMIN_SIDEBAR_WIDTH } from '@/lib/admin-navigation';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f3ec]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e7ddd0] border-t-[#111827]" />
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
    <div className="min-h-screen bg-[#f6f3ec] text-[#111827]">
      <AdminSidebar />

      <div
        className="flex min-h-screen flex-1 flex-col md:pl-[var(--admin-sidebar-width)]"
        style={{ ['--admin-sidebar-width' as string]: `${ADMIN_SIDEBAR_WIDTH}px` }}
      >
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
