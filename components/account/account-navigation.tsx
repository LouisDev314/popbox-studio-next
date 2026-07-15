'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const accountItems = [
  { href: '/account', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/kuji', label: 'Kuji History' },
] as const;

export function getAccountNavigationItem(pathname: string) {
  if (pathname === '/account/orders' || pathname.startsWith('/account/orders/')) return accountItems[1];
  if (pathname === '/account/kuji' || pathname.startsWith('/account/kuji/')) return accountItems[2];
  return accountItems[0];
}

export function AccountNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = getAccountNavigationItem(pathname);
  const activeHref = activeItem.href;

  return (
    <>
      <div className="mb-8 lg:hidden">
        <Select value={activeHref} onValueChange={(value) => value && router.push(value)}>
          <SelectTrigger className="h-11 w-full"><SelectValue>{activeItem.label}</SelectValue></SelectTrigger>
          <SelectContent align="start" className="w-full">
            {accountItems.map((item) => <SelectItem key={item.href} value={item.href}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <nav aria-label="Account" className="hidden lg:block">
        <div className="sticky top-28 space-y-1 border-r border-border/70 pr-6">
          {accountItems.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn('block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
