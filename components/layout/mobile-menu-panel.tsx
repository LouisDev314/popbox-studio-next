'use client';

import { type CSSProperties } from 'react';
import Link from 'next/link';
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import {
  IStoreCollectionNavItem,
  MOBILE_PRIMARY_NAV_ITEMS,
} from '@/components/layout/store-navigation';
import { cn } from '@/lib/utils';

interface IMobileMenuPanelProps {
  collectionNavItems: IStoreCollectionNavItem[];
  isOpen: boolean;
  onNavigate: () => void;
}

function isMenuItemActive(pathname: string, currentSearchParams: ReadonlyURLSearchParams, href: string) {
  const [hrefPathname, hrefQueryString] = href.split('?');

  if (pathname !== hrefPathname) {
    return false;
  }

  const targetSearchParams = new URLSearchParams(hrefQueryString ?? '');

  if ([...targetSearchParams.keys()].length === 0) {
    return [...currentSearchParams.keys()].length === 0;
  }

  for (const [key, value] of targetSearchParams.entries()) {
    if (currentSearchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function MobileMenuPanel(props: IMobileMenuPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuItems = [...MOBILE_PRIMARY_NAV_ITEMS, ...props.collectionNavItems];

  return (
    <div className="flex flex-col overflow-hidden border border-border/70 bg-background shadow-[0_32px_72px_-40px_hsl(var(--foreground)/0.58)]">

      <nav className="flex-1 overflow-y-auto px-4 py-4 mb-4">
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const isActive = isMenuItemActive(pathname, searchParams, item.href);
            const itemStyle: CSSProperties = {
              transitionDelay: props.isOpen ? `${index * 55}ms` : '0ms',
            };

            return (
              <Link
                key={item.href}
                href={item.href}
                style={itemStyle}
                className={cn(
                  'group flex items-center justify-between rounded-[26px] border px-4 py-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  props.isOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
                  isActive
                    ? 'border-primary/40 bg-primary/12 shadow-[0_18px_38px_-30px_hsl(var(--foreground)/0.45)]'
                    : 'border-border/70 bg-gradient-to-br from-background to-muted/45 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/60',
                )}
                onClick={props.onNavigate}
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </nav>

      {/*<div className="border-t border-border/60 px-5 py-4">*/}
      {/*  <div className="rounded-[24px] bg-muted/35 px-4 py-4">*/}
      {/*    <p className="text-sm font-semibold text-foreground">Collector-first storefront</p>*/}
      {/*    <p className="mt-2 text-sm text-muted-foreground">*/}
      {/*      Premium product discovery, secure checkout, and focused navigation without adding backend complexity.*/}
      {/*    </p>*/}
      {/*  </div>*/}
      {/*</div>*/}
    </div>
  );
}
