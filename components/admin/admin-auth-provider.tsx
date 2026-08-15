'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  isAuthRetryableFetchError,
  type Session,
} from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { ADMIN_SIDEBAR_WIDTH } from '@/lib/admin-navigation';
import { Toaster } from '@/components/ui/sonner';
import {
  ADMIN_AUTH_STATE_EVENT,
  type AdminAuthFailureReason,
  validateAdminSession,
} from '@/lib/auth/admin-session-client';
import { signOutSupabaseSession } from '@/lib/auth/supabase-logout';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f3ec]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e7ddd0] border-t-[#111827]" />
    </div>
  );
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [resolvedPathname, setResolvedPathname] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [supabase] = useState(() => (
    typeof window === 'undefined' ? null : createClient()
  ));
  const recoveryPromiseRef = useRef<Promise<void> | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isLoading = resolvedPathname !== pathname;

  const clearAuthSensitiveQueries = useCallback(async (includeAccount: boolean) => {
    await queryClient.cancelQueries({ queryKey: ['admin'] });
    queryClient.removeQueries({ queryKey: ['admin'] });

    if (includeAccount) {
      await queryClient.cancelQueries({ queryKey: ['account'] });
      queryClient.removeQueries({ queryKey: ['account'] });
    }
  }, [queryClient]);

  const transitionToLogin = useCallback((reason: AdminAuthFailureReason) => {
    if (recoveryPromiseRef.current) {
      return recoveryPromiseRef.current;
    }

    setResolvedPathname(null);
    const shouldClearSession = reason !== 'forbidden';
    const recovery = (async () => {
      await clearAuthSensitiveQueries(shouldClearSession);

      if (shouldClearSession && supabase) {
        try {
          await signOutSupabaseSession(supabase);
        } catch {
          // Navigation must remain available even if browser storage is unavailable.
        }
      }

      const loginPath = reason === 'forbidden'
        ? '/admin/login?reason=forbidden'
        : reason === 'session-expired'
          ? '/admin/login?reason=session-expired'
          : '/admin/login?reason=unauthenticated';
      router.replace(loginPath);
    })().finally(() => {
      recoveryPromiseRef.current = null;
      setIsSigningOut(false);
    });

    recoveryPromiseRef.current = recovery;
    return recovery;
  }, [clearAuthSensitiveQueries, router, supabase]);

  const logout = useCallback(() => {
    setIsSigningOut(true);
    return transitionToLogin('unauthenticated');
  }, [transitionToLogin]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    const resolveSession = (session: Session | null) => {
      if (!isActive) {
        return;
      }

      if (isLoginPage) {
        setResolvedPathname(pathname);
        return;
      }

      try {
        validateAdminSession(session);
      } catch (error) {
        const reason = error && typeof error === 'object' && 'reason' in error
          && error.reason === 'session-expired'
          ? 'session-expired'
          : 'unauthenticated';
        void transitionToLogin(reason);
        return;
      }

      setResolvedPathname(pathname);
    };

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && isAuthRetryableFetchError(error)) {
        // Keep the shell (and its Logout action) available during a temporary
        // Auth outage. Token-requiring operations still fail closed.
        setResolvedPathname(pathname);
        return;
      }

      resolveSession(error ? null : session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
    });

    const handleAdminAuthFailure = (event: Event) => {
      const reason = (event as CustomEvent<AdminAuthFailureReason>).detail;
      void transitionToLogin(reason);
    };
    window.addEventListener(ADMIN_AUTH_STATE_EVENT, handleAdminAuthFailure);

    return () => {
      isActive = false;
      subscription.unsubscribe();
      window.removeEventListener(ADMIN_AUTH_STATE_EVENT, handleAdminAuthFailure);
    };
  }, [isLoginPage, pathname, supabase, transitionToLogin]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-[#111827]">
      <AdminSidebar isSigningOut={isSigningOut} onLogout={logout} />
      <Toaster />

      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-[var(--admin-sidebar-width)]"
        style={{ ['--admin-sidebar-width' as string]: `${ADMIN_SIDEBAR_WIDTH}px` }}
      >
        <main className="flex-1 overflow-y-auto">
          <div className="min-w-0 w-full px-4 pb-6 pt-[4.5rem] sm:px-6 sm:pb-6 sm:pt-20 md:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
