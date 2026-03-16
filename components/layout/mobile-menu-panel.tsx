'use client';

import { type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface IMobileMenuItem {
  description: string;
  href: string;
  label: string;
}

interface IMobileMenuPanelProps {
  isOpen: boolean;
  onNavigate: () => void;
}

const MOBILE_MENU_ITEMS: IMobileMenuItem[] = [
  {
    label: 'Home',
    href: '/home',
    description: 'Featured drops, recent releases, and storefront highlights.',
  },
  {
    label: 'Shop All',
    href: '/products',
    description: 'Browse every figure, collectible, and PopBox Studio release.',
  },
  {
    label: 'Ichiban Kuji',
    href: '/products?type=kuji',
    description: 'Premium lottery-style prizes and ticket-based launches.',
  },
];

function isMenuItemActive(pathname: string, href: string) {
  if (href.includes('?')) {
    return false;
  }

  const pathnameOnlyHref = href.split('?')[0];
  return pathname === pathnameOnlyHref;
}

export function MobileMenuPanel(props: IMobileMenuPanelProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5rem)] flex-col overflow-hidden border border-border/70 bg-background shadow-[0_32px_72px_-40px_hsl(var(--foreground)/0.58)]">
      <div className="border-b border-border/60 px-5 pt-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Mobile navigation
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Shop PopBox Studio with less friction.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fast access to the storefront essentials, tuned for one-handed browsing.
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {MOBILE_MENU_ITEMS.map((item, index) => {
            const isActive = isMenuItemActive(pathname, item.href);
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
                    : 'border-border/70 bg-gradient-to-br from-background to-muted/45 hover:-translate-y-0.5 hover:border-primary/30',
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

      <div className="border-t border-border/60 px-5 py-4">
        <div className="rounded-[24px] bg-muted/35 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">Collector-first storefront</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Premium product discovery, secure checkout, and focused navigation without adding backend complexity.
          </p>
        </div>
      </div>
    </div>
  );
}
