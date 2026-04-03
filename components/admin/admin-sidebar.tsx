'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, LayoutGrid, Tags, ShoppingCart, Users, Menu, X, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface INavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: INavItem[] = [
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Collections', href: '/admin/collections', icon: LayoutGrid },
  { label: 'Tags', href: '/admin/tags', icon: Tags },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Legal', href: '/admin/legal', icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        aria-label={isMobileOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={isMobileOpen}
        className="fixed top-3 left-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card shadow-md md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/10 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-muted transition-transform duration-200 ease-out md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Branding */}
        <div className="flex h-16 items-center gap-2 px-5">
          <Link
            href="/admin"
            className="flex flex-col leading-tight"
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="text-base font-bold tracking-tight text-foreground">
              PopBox Studio
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2" aria-label="Admin navigation">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-primary/12 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors duration-150',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/70 group-hover:text-foreground',
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom area — reserved for future use */}
        <div className="px-3 pb-4" />
      </aside>
    </>
  );
}
