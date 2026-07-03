'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, AlertTriangle, Package } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminOrderListItem, IAdminOrderListResponse, IOrderStatus } from '@/interfaces/order';
import {
  ADMIN_ORDER_DEFAULT_SORT,
  ADMIN_ORDER_DEFAULT_STATUS,
  ADMIN_ORDER_LIST_LIMIT,
  ADMIN_ORDER_SORT_OPTIONS,
  ADMIN_ORDER_STATUS_OPTIONS,
  buildAdminOrderListQueryParams,
  buildAdminOrdersQueryKey,
  getAdminOrderCustomerName,
  parseAdminOrderSortParam,
  parseAdminOrderStatusParam,
  type AdminOrderStatusFilter,
} from '@/lib/admin-order-filters';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LastOnePrizeBadge from '@/components/admin/orders/last-one-prize-badge';
import { buildAdminOrderPath } from '@/utils/admin-order';
import { AdminSearchForm } from '@/components/admin/admin-search-form';
import { AdminFilterSelect } from '@/components/admin/admin-filter-select';

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

function OrderAttentionIndicator({ order }: { order: IAdminOrderListItem }) {
  if (order.status !== 'paid_needs_attention') {
    return null;
  }

  return (
    <div className="mt-2 flex max-w-xs items-start gap-1.5 rounded-lg border border-[#f6cdb8] bg-[#fff8f4] px-2 py-1.5 text-xs leading-5 text-[#b54708]">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {order.attention?.message ? (
        <span className="line-clamp-2">{order.attention.message}</span>
      ) : null}
    </div>
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
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-foreground">
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

function OrderMobileCard({
  onOpen,
  order,
}: {
  onOpen: () => void;
  order: IAdminOrderListResponse['items'][number];
}) {
  const customerName = getAdminOrderCustomerName(order);

  return (
    <article
      className="cursor-pointer rounded-[24px] border border-[#ece4d8] bg-white p-4 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)] transition-colors hover:bg-[#fcf8f0]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#111827]">{order.publicId}</span>
            {order.includesLastOnePrize ? <LastOnePrizeBadge /> : null}
          </div>
          <p className="mt-1 text-sm font-medium text-[#111827]">{customerName || 'Guest'}</p>
          <p className="mt-1 break-all text-xs text-[#6b7280]">{order.customer.email}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <OrderAttentionIndicator order={order} />

      <dl className="mt-4 grid gap-3 text-sm text-[#6b7280] sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">Total</dt>
          <dd className="mt-1 font-semibold text-[#111827]">{formatPrice(order.totalCents, order.currency)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8577]">Placed</dt>
          <dd className="mt-1 text-[#111827]">{order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

// eslint-disable-next-line complexity
export default function AdminOrdersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('search')?.trim() ?? '';
  const activeStatus = parseAdminOrderStatusParam(searchParams.get('status')) ?? ADMIN_ORDER_DEFAULT_STATUS;
  const activeSort = parseAdminOrderSortParam(searchParams.get('sort')) ?? ADMIN_ORDER_DEFAULT_SORT;
  const [searchState, setSearchState] = useState({
    urlSearch: currentQuery,
    value: currentQuery,
  });
  const [pageState, setPageState] = useState<{
    cursor?: string;
    nextCursor: string | null;
    orders: IAdminOrderListItem[];
    signature: string;
  }>({
    cursor: undefined,
    nextCursor: null,
    orders: [],
    signature: '',
  });
  const searchInput = searchState.urlSearch === currentQuery ? searchState.value : currentQuery;
  const querySignature = `${currentQuery}|${activeStatus}|${activeSort}`;
  const isSameQuerySignature = pageState.signature === querySignature;
  const orders = isSameQuerySignature ? pageState.orders : [];
  const nextCursor = isSameQuerySignature ? pageState.nextCursor : null;
  const queryParams = useMemo(() => buildAdminOrderListQueryParams({
    cursor: isSameQuerySignature ? pageState.cursor : undefined,
    limit: ADMIN_ORDER_LIST_LIMIT,
    search: currentQuery,
    sort: activeSort,
    status: activeStatus,
  }), [activeSort, activeStatus, currentQuery, isSameQuerySignature, pageState.cursor]);
  const queryKey = useMemo(() => buildAdminOrdersQueryKey(queryParams), [queryParams]);

  const replaceSearchParams = useCallback((mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/orders?${nextQueryString}` : '/admin/orders';

    router.replace(nextUrl, { scroll: false });
  }, [router, searchParams]);

  const handleOrdersSuccess = useCallback((response: Awaited<ReturnType<typeof QueryConfigs.fetchAdminOrders>>) => {
    const page = response.data.data;
    setPageState((currentState) => ({
      cursor: queryParams.cursor,
      nextCursor: page.nextCursor,
      orders: queryParams.cursor && currentState.signature === querySignature
        ? [...currentState.orders, ...page.items]
        : page.items,
      signature: querySignature,
    }));
  }, [queryParams.cursor, querySignature]);

  const {
    isPending,
    isFetching,
    isError,
  } = useCustomizeQuery<IAdminOrderListResponse>({
    queryKey,
    queryFn: () => QueryConfigs.fetchAdminOrders(queryParams),
    onSuccess: handleOrdersSuccess,
  });

  const hasActiveSearch = currentQuery.length > 0;
  const hasActiveStatusFilter = activeStatus !== 'all';
  const hasActiveSort = activeSort !== ADMIN_ORDER_DEFAULT_SORT;

  const handleStatusChange = (status: AdminOrderStatusFilter) => {
    replaceSearchParams((params) => {
      if (status === 'all') {
        params.delete('status');
      } else {
        params.set('status', status);
      }
    });
  };

  const handleSortChange = (sort: string) => {
    replaceSearchParams((params) => {
      if (sort === ADMIN_ORDER_DEFAULT_SORT) {
        params.delete('sort');
      } else {
        params.set('sort', sort);
      }
    });
  };

  const submitSearch = (value: string) => {
    const nextQuery = value.trim();
    setSearchState({ urlSearch: nextQuery, value: nextQuery });

    replaceSearchParams((params) => {
      if (nextQuery) {
        params.set('search', nextQuery);
      } else {
        params.delete('search');
      }
    });
  };

  const clearSearch = () => {
    setSearchState({ urlSearch: '', value: '' });
    replaceSearchParams((params) => {
      params.delete('search');
    });
  };

  const clearFilters = () => {
    replaceSearchParams((params) => {
      params.delete('search');
      params.delete('status');
      params.delete('sort');
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Orders</h1>

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
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_18px_38px_-28px_hsl(var(--primary)/0.72)]'
                      : 'border-[#dfd5c5] bg-white text-[#475467] hover:border-primary/45 hover:bg-accent/70 hover:text-[#111827]',
                  ].join(' ')}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-[#e4dccf] bg-white p-4 shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)] sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.28fr)] lg:items-end">
              <AdminSearchForm
                ariaLabel="Search orders"
                className="w-full"
                onChange={(value) => setSearchState({ urlSearch: currentQuery, value })}
                onClear={clearSearch}
                onSubmit={submitSearch}
                placeholder="Search orders by ID, customer name, or email"
                value={searchInput}
              />
              <AdminFilterSelect
                id="admin-order-sort-filter"
                label="Sort"
                onChange={handleSortChange}
                options={ADMIN_ORDER_SORT_OPTIONS}
                value={activeSort}
              />
            </div>

            {(hasActiveSearch || hasActiveStatusFilter || hasActiveSort) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#8f8577]">
                {hasActiveSearch ? (
                  <span className="rounded-full border border-[#ece4d8] bg-[#fbfaf7] px-3 py-1">
                    Search: {currentQuery}
                  </span>
                ) : null}
                {hasActiveStatusFilter ? (
                  <span className="rounded-full border border-[#ece4d8] bg-[#fbfaf7] px-3 py-1">
                    Status: {ADMIN_ORDER_STATUS_OPTIONS.find((option) => option.value === activeStatus)?.label}
                  </span>
                ) : null}
                {hasActiveSort ? (
                  <span className="rounded-full border border-[#ece4d8] bg-[#fbfaf7] px-3 py-1">
                    Sort: {ADMIN_ORDER_SORT_OPTIONS.find((option) => option.value === activeSort)?.label}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {isPending && orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6b7280]">Loading orders...</div>
            ) : isError ? (
              <div className="rounded-3xl border border-[#f0d2d2] bg-[#fff7f7] py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[#b42318]">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="font-medium text-[#b42318]">Failed to load orders. Please try again.</p>
              </div>
            ) : orders.length === 0 ? (
              <EmptyOrdersState
                hasActiveFilters={hasActiveStatusFilter || hasActiveSort}
                hasActiveSearch={hasActiveSearch}
                onClearFilters={clearFilters}
                onClearSearch={clearSearch}
              />
            ) : (
              <>
                <div className="space-y-3 md:hidden" data-testid="admin-orders-mobile-list">
                  {orders.map((order) => (
                    <OrderMobileCard
                      key={order.id}
                      order={order}
                      onOpen={() => router.push(buildAdminOrderPath(order.id))}
                    />
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
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
                      {orders.map((order) => {
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
                              <OrderAttentionIndicator order={order} />
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
                {nextCursor ? (
                  <div className="mt-5 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full border-[#dfd5c5] bg-white px-5 text-sm text-[#111827] hover:bg-[#f8f4eb]"
                      disabled={isFetching}
                      onClick={() => setPageState((currentState) => ({
                        ...currentState,
                        cursor: nextCursor,
                        signature: querySignature,
                      }))}
                    >
                      {isFetching ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
