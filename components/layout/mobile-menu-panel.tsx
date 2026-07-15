'use client';

import { type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildSignInHref, validateInternalNext } from '@/lib/auth/redirects';
import {
  FEATURED_NAV_HREF,
  getActiveTopLevelNavKey,
  IStoreCollectionNavItem,
  MOBILE_PRIMARY_NAV_ITEMS,
  isStoreNavItemActive,
} from '@/components/layout/store-navigation';
import { cn } from '@/lib/utils';

interface IMobileMenuPanelProps {
  collectionNavItems: IStoreCollectionNavItem[];
  isOpen: boolean;
  onNavigate: () => void;
}

export function MobileMenuPanel(props: IMobileMenuPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useCustomerAuth();
  const activeTopLevelNavKey = getActiveTopLevelNavKey(pathname, searchParams);
  const collectionMenuItems = props.collectionNavItems.filter((item) => item.href !== FEATURED_NAV_HREF);
  const query = searchParams.toString();
  const currentPath = validateInternalNext(`${pathname}${query ? `?${query}` : ''}`, '/');

  const handleSignOut = async () => {
    await auth.signOut();
    props.onNavigate();
    window.location.reload();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-border/70 bg-background shadow-sm">
      <nav className="flex-1 overflow-y-auto px-4 py-4 mb-4">
        <div className="space-y-6">
          <div className="space-y-3">
            {MOBILE_PRIMARY_NAV_ITEMS.map((item, index) => {
              const isActive = activeTopLevelNavKey === item.key;
              const itemStyle: CSSProperties = {
                transitionDelay: props.isOpen ? `${index * 55}ms` : '0ms',
              };

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={itemStyle}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    props.isOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
                    isActive
                      ? 'bg-accent text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  onClick={props.onNavigate}
                >
                  <span className="min-w-0 text-sm font-medium leading-snug break-words">
                    {item.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
              );
            })}
          </div>

          {collectionMenuItems.length > 0 ? (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">
                All Collections
              </p>
              <div className="space-y-2">
                {collectionMenuItems.map((item, index) => {
                  const isActive = isStoreNavItemActive(pathname, searchParams, item.href);
                  const itemStyle: CSSProperties = {
                    transitionDelay: props.isOpen
                      ? `${(MOBILE_PRIMARY_NAV_ITEMS.length + index) * 55}ms`
                      : '0ms',
                  };

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={itemStyle}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        props.isOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
                        isActive
                          ? 'bg-accent text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                      onClick={props.onNavigate}
                    >
                      <span className="min-w-0 text-sm font-medium leading-snug break-words">
                        {item.label}
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border/60 pt-4">
            <p className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">Account</p>
            {auth.status === 'resolving' ? (
              <div className="space-y-2 px-2" aria-busy="true" aria-label="Checking account status">
                <Skeleton className="h-11 w-full rounded-full" />
                <Skeleton className="h-11 w-4/5 rounded-full" />
              </div>
            ) : null}
            {auth.status === 'signedOut' ? (
              <Button asChild className="w-full">
                <Link href={buildSignInHref(currentPath)} onClick={props.onNavigate}>
                  Sign In / Create Account
                </Link>
              </Button>
            ) : null}
            {auth.status === 'conflict' || auth.status === 'unavailable' ? (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/account" onClick={props.onNavigate}>Account Help</Link>
                </Button>
                <Button type="button" variant="ghost" className="w-full text-destructive" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : null}
            {auth.status === 'customer' ? (
              <div className="space-y-1">
                {[
                  ['/account/orders', 'My Orders'],
                  ['/account/kuji', 'Kuji History'],
                  ['/account', 'Profile'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={props.onNavigate}
                  >
                    {label}
                  </Link>
                ))}
                <button
                  type="button"
                  className="flex w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}
