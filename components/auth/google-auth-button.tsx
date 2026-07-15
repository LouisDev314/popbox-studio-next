'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { validateInternalNext } from '@/lib/auth/redirects';

export function GoogleAuthButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [isPending, setIsPending] = useState(false);

  const handleGoogleAuth = async () => {
    setIsPending(true);
    onError('');
    const safeNext = validateInternalNext(next);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      setIsPending(false);
      onError('Google sign-in is unavailable right now. Please try again.');
    }
  };

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" disabled={isPending} onClick={handleGoogleAuth}>
      {isPending ? <Spinner className="mr-2" /> : null}
      Sign up with Google
    </Button>
  );
}
