import type { ReactNode } from 'react';
import { AccountNavigation } from '@/components/account/account-navigation';

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
      <AccountNavigation />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
