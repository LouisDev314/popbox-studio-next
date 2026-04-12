'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getAdminHeaderContext,
} from '@/lib/admin-navigation';
import { cn } from '@/lib/utils';

function getSearchConfig(pathname: string) {
  if (pathname.startsWith('/admin/products')) {
    return {
      action: '/admin/products',
      placeholder: 'Search products',
      visible: true,
    } as const;
  }

  if (pathname.startsWith('/admin/orders')) {
    return {
      action: '/admin/orders',
      placeholder: 'Search orders by order number or email',
      visible: true,
    } as const;
  }

  if (pathname.startsWith('/admin/customers')) {
    return {
      action: '/admin/customers',
      placeholder: 'Search customers by email',
      visible: true,
    } as const;
  }

  return {
    action: '',
    placeholder: '',
    visible: false,
  } as const;
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerContext = getAdminHeaderContext(pathname);
  const searchConfig = getSearchConfig(pathname);
  const currentQuery = searchConfig.visible ? searchParams.get('q') ?? '' : '';
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!searchConfig.visible) {
      return;
    }

    const nextQuery = query.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }

    const nextQueryString = params.toString();
    router.push(nextQueryString ? `${searchConfig.action}?${nextQueryString}` : searchConfig.action);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4dccf] bg-[#f8f5ee]/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 pl-[4.5rem] sm:px-6 sm:pl-20 md:pl-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="truncate text-lg font-semibold tracking-tight text-[#111827]">
                {headerContext.title}
              </h2>
            </div>
          </div>
        </div>

        {searchConfig.visible ? (
          <form
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            onSubmit={submitSearch}
          >
            <div className="relative w-full max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchConfig.placeholder}
                className={cn(
                  'h-12 w-full rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] pl-11 pr-4 text-sm text-[#111827] outline-none transition',
                  'placeholder:text-[#9ca3af] focus:border-[#f4c57d] focus:ring-2 focus:ring-[#f6dfb4]',
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                className="h-11 rounded-2xl bg-[#f59e0b] px-4 text-sm font-semibold text-[#111827] shadow-[0_18px_38px_-28px_rgba(245,158,11,0.85)] hover:bg-[#f3aa2f]"
              >
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </header>
  );
}
