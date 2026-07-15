'use client';

import { useState } from 'react';
import Image from 'next/image';
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
      <span className="grid grid-cols-[1.25rem_auto_1.25rem] items-center gap-2">
        <span className="flex size-5 items-center justify-center">
          {isPending ? (
            <Spinner />
          ) : (
            <Image src="/google-logo.webp" alt="" width={20} height={20} className="size-5 object-contain" />
          )}
        </span>
        <span>Continue with Google</span>
        <span className="size-5" aria-hidden="true" />
      </span>
    </Button>
  );
}
