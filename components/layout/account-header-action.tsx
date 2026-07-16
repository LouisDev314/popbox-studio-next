'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CircleUserRound } from 'lucide-react';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildSignInHref, validateInternalNext } from '@/lib/auth/redirects';
import { useHasHydrated } from '@/hooks/use-has-hydrated';

export const ACCOUNT_HEADER_ACTION_ID = 'store-account-trigger';

const triggerClassName = 'hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 xl:inline-flex';

interface IAccountHeaderActionProps {
  isMenuOpen: boolean;
  onMenuOpenChange: (isOpen: boolean) => void;
}

export function AccountHeaderAction(props: IAccountHeaderActionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useCustomerAuth();
  const hasHydrated = useHasHydrated();
  const query = searchParams.toString();
  const currentPath = validateInternalNext(`${pathname}${query ? `?${query}` : ''}`, '/');
  const requestedNext = searchParams.get('next');
  const signInNext = pathname.startsWith('/account/') && requestedNext
    ? validateInternalNext(requestedNext, '/')
    : currentPath;

  if (!hasHydrated || auth.status === 'resolving') {
    return (
      <button
        id={ACCOUNT_HEADER_ACTION_ID}
        type="button"
        className={triggerClassName}
        aria-busy="true"
        aria-label="Checking account status"
        disabled
      >
        <CircleUserRound className="h-5 w-5" />
      </button>
    );
  }

  if (auth.status === 'signedOut') {
    return (
      <Link
        id={ACCOUNT_HEADER_ACTION_ID}
        href={buildSignInHref(signInNext)}
        aria-label="Sign in or create an account"
        className={triggerClassName}
      >
        <CircleUserRound className="h-5 w-5" />
      </Link>
    );
  }

  if (auth.status === 'conflict' || auth.status === 'unavailable') {
    return (
      <Link
        id={ACCOUNT_HEADER_ACTION_ID}
        href="/account"
        aria-label="Open account support"
        className={triggerClassName}
      >
        <CircleUserRound className="h-5 w-5" />
      </Link>
    );
  }

  const handleSignOut = async () => {
    await auth.signOut();
    router.refresh();
    window.setTimeout(() => document.getElementById(ACCOUNT_HEADER_ACTION_ID)?.focus(), 0);
  };

  return (
    <DropdownMenu
      defaultTriggerId={ACCOUNT_HEADER_ACTION_ID}
      open={props.isMenuOpen}
      onOpenChange={props.onMenuOpenChange}
    >
      <DropdownMenuTrigger
        id={ACCOUNT_HEADER_ACTION_ID}
        aria-label="Open account menu"
        className={triggerClassName}
      >
        <CircleUserRound className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-52 rounded-xl p-1.5">
        <DropdownMenuItem className="rounded-lg px-3 py-2.5" render={<Link href="/account/orders" />}>
          My Orders
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2.5" render={<Link href="/account/kuji" />}>
          Kuji History
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2.5" render={<Link href="/account" />}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-lg px-3 py-2.5 text-destructive" onClick={handleSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
