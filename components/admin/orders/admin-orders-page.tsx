'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Package } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminOrderListResponse, IOrderStatus } from '@/interfaces/order';
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  filterAdminOrders,
  getAdminOrderCustomerName,
  getAdminOrderStatusCounts,
  parseAdminOrderStatusParam,
  type AdminOrderStatusFilter,
} from '@/lib/admin-order-filters';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LastOnePrizeBadge from '@/components/admin/orders/last-one-prize-badge';
import { buildAdminOrderPath } from '@/utils/admin-order';
import { AdminLiveSearchInput } from '@/components/admin/admin-live-search-input';

const STATUS_BADGE_CONFIG: Record<IOrderStatus, { label: string; className: string }> = {
  pending_payment: {
    label: 'Pending Payment',
    className: 'border border-[#f7d9a3] bg-[#fff7e8] text-[#b06707]',
  },
  paid: {
    label: 'Paid',
    className: 'border border-[#b7ebc6] bg-[#effaf2] text-[#11844d]',
  },
  packed: {
    label: 'Packed',
    className: 'border border-[#cfe1ff] bg-[#eef4ff] text-[#2357d8]',
  },
  shipped: {
    label: 'Shipped',
    className: 'border border-[#d8d7ff] bg-[#f0f0ff] text-[#5145d9]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border border-[#eadfdb] bg-[#faf6f3] text-[#8b6f63]',
  },
  refunded: {
    label: 'Refunded',
    className: 'border border-[#eadfdb] bg-[#faf6f3] text-[#8b6f63]',
  },
  paid_needs_attention: {
    label: 'Needs Attention',
    className: 'border border-[#f6cdb8] bg-[#fff3ed] text-[#b54708]',
  },
  expired: {
    label: 'Expired',
    className: 'border border-[#eadfdb] bg-[#faf6f3] text-[#8b6f63]',
  },
};

function OrderStatusBadge({ status }: { status: IOrderStatus }) {
  const config = STATUS_BADGE_CONFIG[status];

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function EmptyOrdersState({
  hasActiveFilters,
  hasActiveSearch,
  onClearFilters,
  onClearSearch,
}: {
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  const title = hasActiveFilters || hasActiveSearch ? 'No orders match this view.' : 'No orders yet.';
  const description = hasActiveFilters || hasActiveSearch
    ? 'Try clearing the search or switching to a different status.'
    : 'Orders will appear here once customers start checking out.';

  return (
    <div className="rounded-[24px] border border-dashed border-[#e4dccf] bg-[#fffdfa] px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0d9] text-[#b06707]">
        <Package className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6b7280]">{description}</p>
      {hasActiveFilters || hasActiveSearch ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasActiveSearch ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-[#dfd5c5] bg-white px-4 text-sm text-[#111827] hover:bg-[#f8f4eb]"
              onClick={onClearSearch}
            >
              Clear search
            </Button>
          ) : null}
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-[#dfd5c5] bg-white px-4 text-sm text-[#111827] hover:bg-[#f8f4eb]"
              onClick={onClearFilters}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminOrdersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q')?.trim() ?? '';
  const activeStatus = parseAdminOrderStatusParam(searchParams.get('status')) ?? 'all';
  const [searchInput, setSearchInput] = useState(currentQuery);
  const deferredSearchQuery = useDeferredValue(searchInput);

  const replaceSearchParams = useCallback((mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/orders?${nextQueryString}` : '/admin/orders';

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
  } = useCustomizeQuery<IAdminOrderListResponse>({
    queryKey: ['admin', 'orders'],
    queryFn: QueryConfigs.fetchAdminOrders,
  });

  const orders = useMemo(
    () => fetchRes?.data?.data?.items ?? [],
    [fetchRes?.data?.data?.items],
  );
  const statusCounts = useMemo(() => getAdminOrderStatusCounts(orders), [orders]);
  const visibleOrders = useMemo(() => filterAdminOrders(orders, {
    query: deferredSearchQuery,
    status: activeStatus,
  }), [activeStatus, deferredSearchQuery, orders]);
  const hasActiveSearch = currentQuery.length > 0;
  const hasActiveStatusFilter = activeStatus !== 'all';

  const handleStatusChange = (status: AdminOrderStatusFilter) => {
    replaceSearchParams((params) => {
      if (status === 'all') {
        params.delete('status');
      } else {
        params.set('status', status);
      }
    });
  };

  const clearSearch = () => {
    setSearchInput('');
  };

  const clearFilters = () => {
    replaceSearchParams((params) => {
      params.delete('status');
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Orders</h1>
        <p className="text-sm text-[#6b7280]">Manage and track customer orders.</p>
      </div>

      <section className="rounded-3xl border border-[#e4dccf] bg-[#fbfaf7] p-4 shadow-[0_20px_50px_-44px_rgba(17,24,39,0.4)] lg:p-5">
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {ADMIN_ORDER_STATUS_OPTIONS.map((option) => {
              const isActive = activeStatus === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                    isActive
                      ? 'border-[#f59e0b] bg-[#f59e0b] text-white shadow-[0_18px_38px_-28px_rgba(245,158,11,0.85)]'
                      : 'border-[#dfd5c5] bg-white text-[#475467] hover:border-[#f4c57d] hover:bg-[#fff9ef] hover:text-[#111827]',
                  ].join(' ')}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.label}
                  <span className="ml-1.5 opacity-90">({statusCounts[option.value]})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-[#e4dccf] bg-white p-4 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)] sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <AdminLiveSearchInput
                ariaLabel="Search orders"
                className="w-full"
                onChange={setSearchInput}
                onClear={clearSearch}
                placeholder="Search orders by ID, customer name, or email"
                value={searchInput}
              />
            </div>

            {(hasActiveSearch || hasActiveStatusFilter) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#8f8577]">
                {hasActiveStatusFilter ? (
                  <span className="rounded-full border border-[#ece4d8] bg-[#fbfaf7] px-3 py-1">
                    Status: {ADMIN_ORDER_STATUS_OPTIONS.find((option) => option.value === activeStatus)?.label}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {isPending ? (
              <div className="p-8 text-center text-sm text-[#6b7280]">Loading orders...</div>
            ) : isError ? (
              <div className="rounded-3xl border border-[#f0d2d2] bg-[#fff7f7] py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[#b42318]">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="font-medium text-[#b42318]">Failed to load orders. Please try again.</p>
              </div>
            ) : visibleOrders.length === 0 ? (
              <EmptyOrdersState
                hasActiveFilters={hasActiveStatusFilter}
                hasActiveSearch={hasActiveSearch}
                onClearFilters={clearFilters}
                onClearSearch={clearSearch}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#ece4d8] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">
                      <th className="px-4 py-4">Order ID</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4 text-right">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#f1e9dc]">
                    {visibleOrders.map((order) => {
                      const customerName = getAdminOrderCustomerName(order);

                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer transition-colors hover:bg-[#fcf8f0]"
                          onClick={() => router.push(buildAdminOrderPath(order.id))}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-[#111827]">
                                {order.publicId}
                              </span>
                              {order.includesLastOnePrize ? <LastOnePrizeBadge /> : null}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-semibold text-[#111827]">{customerName || 'Guest'}</div>
                            <div className="mt-1 text-xs text-[#6b7280]">{order.customer.email}</div>
                          </td>

                          <td className="px-4 py-4">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          <td className="px-4 py-4 font-semibold text-[#111827]">
                            {formatPrice(order.totalCents, order.currency)}
                          </td>

                          <td className="px-4 py-4 text-right text-xs text-[#6b7280]">
                            {order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}
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
      </section>
    </div>
  );
}
