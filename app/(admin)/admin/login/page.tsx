'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = typeof window === 'undefined' ? null : createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError('Admin authentication is unavailable in this environment.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    router.replace('/admin/products');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card p-6 md:p-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to access the PopBox Studio admin panel
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl border border-primary/20 bg-accent p-4">
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}

          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 pl-3 text-foreground ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:z-10 focus:ring-2 focus:ring-inset focus:ring-ring sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 pl-3 text-foreground ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:z-10 focus:ring-2 focus:ring-inset focus:ring-ring sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
