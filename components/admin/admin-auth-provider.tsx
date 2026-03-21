'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = typeof window === 'undefined' ? null : createClient();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    setIsLoading(true);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;

      if (!session && !isLoginPage) {
        router.replace('/admin/login');
        return;
      }

      if (session && isLoginPage) {
        router.replace('/admin/products');
        return;
      }

      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;

      if (!session && !isLoginPage) {
        setIsLoading(true);
        router.replace('/admin/login');
        return;
      }

      if (session && isLoginPage) {
        setIsLoading(true);
        router.replace('/admin/products');
        return;
      }

      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router, supabase]);

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
