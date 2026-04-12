'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Sidebar, SidebarBody, useSidebar } from '@/components/ui/sidebar';
import {
  ADMIN_BRAND,
  ADMIN_STORE_LINK,
  getAdminNavGroups,
  isAdminNavItemActive,
} from '@/lib/admin-navigation';
import { cn } from '@/lib/utils';

function AdminSidebarContent() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const navGroups = getAdminNavGroups();

  const handleNavigate = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="border-b border-[#e4dccf] px-4 pb-4 pt-5">
        <Link
          href="/admin/products"
          className="flex items-center gap-2.5 rounded-[1.25rem] px-1 py-1 text-[#111827]"
          onClick={handleNavigate}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f172a] text-lg font-semibold text-[#f59e0b] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.85)]">
            {ADMIN_BRAND.mark}
          </div>
          <div className="min-w-0">
            <div className="flex items-end gap-1.5">
              <span className="truncate text-base font-semibold tracking-tight text-[#111827]">
                {ADMIN_BRAND.shortName}
              </span>
              <span className="pb-0.5 text-sm font-medium text-[#6b7280]">
                {ADMIN_BRAND.product}
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-5">
        <nav aria-label="Admin navigation" className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f7f63]">
                {group.label}
              </p>
              <ul className="mt-2.5 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isAdminNavItemActive(item, pathname);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150 ease-out',
                          isActive
                            ? 'bg-[#fff0d9] text-[#b06707] shadow-[0_16px_36px_-30px_rgba(180,103,7,0.75)]'
                            : 'text-[#4b5563] hover:bg-[#fbfaf7] hover:text-[#111827]',
                        )}
                        onClick={handleNavigate}
                      >
                        <span
                          className={cn(
                            'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl transition-colors',
                            isActive
                              ? 'bg-[#fff7ea] text-[#b06707]'
                              : 'bg-[#f8f4eb] text-[#6b7280] group-hover:bg-white group-hover:text-[#111827]',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{item.label}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-[#e4dccf] px-3.5 py-3.5">
        <Link
          href={ADMIN_STORE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-xl border border-[#dfd5c5] bg-[#fbfaf7] px-3.5 py-2.5 text-[13px] font-medium text-[#111827] transition-colors hover:border-[#f4c57d] hover:bg-[#fff9ef]"
          onClick={handleNavigate}
        >
          <span>Back to store</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#b06707] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarBody>
        <AdminSidebarContent />
      </SidebarBody>
    </Sidebar>
  );
}
