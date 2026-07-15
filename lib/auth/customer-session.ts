import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { IAccountProfile } from '@/interfaces/account';
import { getAccountProfileServer } from '@/lib/api/account-server';
import { buildSignInHref, validateInternalNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/server';
import { getAccountApiErrorCode } from '@/utils/api-errors';

export type ServerCustomerAccess =
  | { status: 'signedOut' }
  | { status: 'customer'; accessToken: string; profile: IAccountProfile }
  | { status: 'nonCustomer' }
  | { status: 'conflict' }
  | { status: 'unavailable' };

export const getServerCustomerAccess = cache(async (): Promise<ServerCustomerAccess> => {
  const supabase = await createClient();
  const claimsResult = await supabase.auth.getClaims();

  if (claimsResult.error || !claimsResult.data?.claims) {
    return { status: 'signedOut' };
  }

  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;

  if (sessionResult.error || !accessToken) {
    return { status: 'signedOut' };
  }

  try {
    return {
      status: 'customer',
      accessToken,
      profile: await getAccountProfileServer(accessToken),
    };
  } catch (error) {
    const code = getAccountApiErrorCode(error);

    if (code === 'CUSTOMER_ACCOUNT_REQUIRED') {
      return { status: 'nonCustomer' };
    }

    if (code === 'ACCOUNT_OWNERSHIP_CONFLICT') {
      return { status: 'conflict' };
    }

    return { status: 'unavailable' };
  }
});

export async function requireCustomerAccess(currentPath: string) {
  const access = await getServerCustomerAccess();

  if (access.status === 'signedOut') {
    redirect(buildSignInHref(validateInternalNext(currentPath)));
  }

  if (access.status === 'nonCustomer') {
    redirect('/admin');
  }

  return access;
}

export async function redirectAuthenticatedAccountUser(next: string | null | undefined) {
  const access = await getServerCustomerAccess();

  if (access.status === 'customer') {
    redirect(validateInternalNext(next));
  }

  if (access.status === 'nonCustomer') {
    redirect('/admin');
  }
}
