'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminCustomerListResponse } from '@/interfaces/customer';
import { Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function AdminCustomersPageClient() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q')?.trim().toLocaleLowerCase() ?? '';
  const { data: fetchRes, isPending } = useCustomizeQuery<IAdminCustomerListResponse>({
    queryKey: ['admin', 'customers'],
    queryFn: QueryConfigs.fetchAdminCustomers,
  });

  const customers = useMemo(
    () => fetchRes?.data?.data?.items ?? [],
    [fetchRes?.data?.data?.items],
  );
  const visibleCustomers = useMemo(() => {
    if (!searchQuery) {
      return customers;
    }

    return customers.filter((customer) => {
      const fullName = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();

      return customer.email.toLocaleLowerCase().includes(searchQuery)
        || fullName.includes(searchQuery)
        || (customer.phone?.toLocaleLowerCase().includes(searchQuery) ?? false);
    });
  }, [customers, searchQuery]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        </div>
        {searchQuery ? (
          <div className="rounded-full border border-[#dfd5c5] bg-[#fbfaf7] px-3 py-1.5 text-sm text-[#6b7280]">
            {visibleCustomers.length} result{visibleCustomers.length === 1 ? '' : 's'}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/30 bg-card">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading customers...</div>
        ) : visibleCustomers.length === 0 ? (
          <div className="rounded-xl p-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No customers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Orders</th>
                  <th className="px-5 py-4">Total Spent</th>
                  <th className="px-5 py-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {visibleCustomers.map((c) => {
                  const customerName = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-4 font-medium text-foreground">
                        {customerName}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {c.email}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {c.phone || '—'}
                      </td>
                      <td className="px-5 py-4 text-foreground font-medium">
                        {c.orderCount}
                      </td>
                      <td className="px-5 py-4 font-medium text-primary">
                        {formatPrice(c.totalSpentCents || 0, 'CAD')}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
