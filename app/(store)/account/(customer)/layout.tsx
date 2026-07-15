import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { AccountShell } from '@/components/account/account-shell';
import { requireCustomerAccess } from '@/lib/auth/customer-session';
import { REQUEST_PATH_HEADER, validateInternalNext } from '@/lib/auth/redirects';

export default async function CustomerAccountLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const currentPath = validateInternalNext(requestHeaders.get(REQUEST_PATH_HEADER));

  await requireCustomerAccess(currentPath);

  return <AccountShell>{children}</AccountShell>;
}
