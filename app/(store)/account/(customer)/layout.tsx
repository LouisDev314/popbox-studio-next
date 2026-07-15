import type { ReactNode } from 'react';
import { AccountShell } from '@/components/account/account-shell';

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
