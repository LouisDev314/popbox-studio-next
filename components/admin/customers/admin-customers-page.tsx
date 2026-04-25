'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Users } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminCustomerListResponse } from '@/interfaces/customer';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminLiveSearchInput } from '@/components/admin/admin-live-search-input';
import {
  filterAdminCustomersBySearch,
  getAdminCustomerName,
} from '@/lib/admin-customer-filters';

function EmptyCustomersState({
  hasActiveSearch,
  onClearSearch,
}: {
  hasActiveSearch: boolean;
  onClearSearch: () => void;
}) {
  const title = hasActiveSearch ? 'No customers match this search.' : 'No customers yet.';
  const description = hasActiveSearch
    ? 'Try a different name or email, or clear the search to see the full list.'
    : 'Customers will appear here after they place their first order.';

  return (
    <div className="rounded-[24px] border border-dashed border-[#e4dccf] bg-[#fffdfa] px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0d9] text-[#b06707]">
        <Users className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6b7280]">{description}</p>
      {hasActiveSearch ? (
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-[#dfd5c5] bg-white px-4 text-sm text-[#111827] hover:bg-[#f8f4eb]"
            onClick={onClearSearch}
          >
            Clear search
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CustomerMobileCard({
  customer,
}: {
  customer: IAdminCustomerListResponse['items'][number];
}) {
  return (
    <article className="rounded-[24px] border border-[#ece4d8] bg-white p-4 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827]">{getAdminCustomerName(customer) || '—'}</p>
          <p className="mt-1 break-all text-xs text-[#6b7280]">{customer.email}</p>
          <p className="mt-1 text-xs text-[#6b7280]">{customer.phone || 'No phone on file'}</p>
        </div>
        <div className="rounded-full border border-[#ece4d8] bg-[#fbfaf7] px-3 py-1 text-xs font-medium text-[#111827]">
          {customer.orderCount} order{customer.orderCount === 1 ? '' : 's'}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-[#6b7280] sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">Total spent</dt>
          <dd className="mt-1 font-semibold text-[#11844d]">{formatPrice(customer.totalSpentCents || 0, 'CAD')}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">Joined</dt>
          <dd className="mt-1 text-[#111827]">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function AdminCustomersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q')?.trim() ?? '';
  const [searchInput, setSearchInput] = useState(currentQuery);
  const deferredSearchQuery = useDeferredValue(searchInput);

  const replaceSearchParams = useCallback((mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/customers?${nextQueryString}` : '/admin/customers';

    router.replace(nextUrl, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const nextQuery = searchInput.trim();

    if (nextQuery === currentQuery) {
      return;
    }

    replaceSearchParams((params) => {
      if (nextQuery) {
        params.set('q', nextQuery);
      } else {
        params.delete('q');
      }
    });
  }, [currentQuery, replaceSearchParams, searchInput]);

  const {
    data: fetchRes,
    isPending,
    isError,
  } = useCustomizeQuery<IAdminCustomerListResponse>({
    queryKey: ['admin', 'customers'],
    queryFn: QueryConfigs.fetchAdminCustomers,
  });

  const customers = useMemo(
    () => fetchRes?.data?.data?.items ?? [],
    [fetchRes?.data?.data?.items],
  );
  const visibleCustomers = useMemo(() => filterAdminCustomersBySearch(customers, {
    query: deferredSearchQuery,
  }), [customers, deferredSearchQuery]);
  const hasActiveSearch = currentQuery.length > 0;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Customers</h1>

      <section className="rounded-[24px] border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
        <div className="rounded-[24px] border border-[#e4dccf] bg-white p-4 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AdminLiveSearchInput
              ariaLabel="Search customers"
              className="w-full"
              onChange={setSearchInput}
              onClear={() => setSearchInput('')}
              placeholder="Search customers by name or email"
              value={searchInput}
            />

            {hasActiveSearch ? (
              <div className="rounded-full border border-[#e8dece] bg-[#f8f4eb] px-3.5 py-2 text-sm text-[#6b7280]">
                <span className="font-medium text-[#111827]">
                  {visibleCustomers.length} matching customer{visibleCustomers.length === 1 ? '' : 's'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {isPending ? (
              <div className="p-8 text-center text-sm text-[#6b7280]">Loading customers...</div>
            ) : isError ? (
              <div className="rounded-[24px] border border-[#f0d2d2] bg-[#fff7f7] py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[#b42318]">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="font-medium text-[#b42318]">Failed to load customers. Please try again.</p>
              </div>
            ) : visibleCustomers.length === 0 ? (
              <EmptyCustomersState
                hasActiveSearch={hasActiveSearch}
                onClearSearch={() => setSearchInput('')}
              />
            ) : (
              <>
                <div className="space-y-3 md:hidden" data-testid="admin-customers-mobile-list">
                  {visibleCustomers.map((customer) => (
                    <CustomerMobileCard key={customer.id} customer={customer} />
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#ece4d8] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">
                        <th className="px-4 py-4">Name</th>
                        <th className="px-4 py-4">Email</th>
                        <th className="px-4 py-4">Phone</th>
                        <th className="px-4 py-4">Orders</th>
                        <th className="px-4 py-4">Total Spent</th>
                        <th className="px-4 py-4 text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1e9dc]">
                      {visibleCustomers.map((customer) => (
                        <tr key={customer.id} className="transition-colors hover:bg-[#fcf8f0]">
                          <td className="px-4 py-4 font-semibold text-[#111827]">
                            {getAdminCustomerName(customer) || '—'}
                          </td>
                          <td className="px-4 py-4 text-[#6b7280]">
                            {customer.email}
                          </td>
                          <td className="px-4 py-4 text-[#6b7280]">
                            {customer.phone || '—'}
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#111827]">
                            {customer.orderCount}
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#11844d]">
                            {formatPrice(customer.totalSpentCents || 0, 'CAD')}
                          </td>
                          <td className="px-4 py-4 text-right text-xs text-[#6b7280]">
                            {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
