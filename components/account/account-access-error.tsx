'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';
import { Button } from '@/components/ui/button';

export function AccountAccessError({ type }: { type: 'conflict' | 'unavailable' }) {
  const router = useRouter();
  const auth = useCustomerAuth();

  const signOut = async () => {
    await auth.signOut();
    router.replace('/account/sign-in');
    router.refresh();
  };

  return (
    <div className="max-w-xl py-12">
      <AlertCircle className="h-10 w-10 text-primary" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{type === 'conflict' ? 'We need help linking your account' : 'Account temporarily unavailable'}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {type === 'conflict' ? 'Your sign-in is secure, but we could not safely connect it to an existing customer record.' : 'We could not load your account right now. Everything stays unchanged.'}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        {type === 'conflict' ? <Button asChild><Link href="/contact">Contact Us</Link></Button> : <Button onClick={() => router.refresh()}>Try Again</Button>}
        <Button variant="outline" onClick={signOut}>Sign Out</Button>
      </div>
    </div>
  );
}
