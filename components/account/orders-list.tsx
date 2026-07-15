'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { getAccountOrderItemCount, OrderStatusBadge } from '@/components/account/order-status-badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import QueryConfigs from '@/configs/api/query-config';
import type { IAccountOrderListPage } from '@/interfaces/account';
import { formatPrice } from '@/lib/utils';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
}

export function OrdersList({ initialPage }: { initialPage: IAccountOrderListPage }) {
  const query = useInfiniteQuery({
    queryKey: ['account', 'orders'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => (await QueryConfigs.fetchAccountOrders(pageParam)).data.data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: { pages: [initialPage], pageParams: [undefined] },
    retry: false,
  });
  const orders = query.data.pages.flatMap((page) => page.items);

  if (orders.length === 0) {
    return <AccountEmptyState icon={PackageOpen} title="No orders yet" description="When you place an order while signed in, it will appear here." actionHref="/products" actionLabel="Start Shopping" />;
  }

  return (
    <div>
      <div className="hidden grid-cols-[1.1fr_1fr_.8fr_.7fr_1fr_auto] gap-4 border-b border-border px-4 pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Order</span><span>Date</span><span>Status</span><span>Items</span><span className="text-right">Total</span><span className="w-5" />
      </div>
      <div className="divide-y divide-border">
        {orders.map((order) => (
          <Link key={order.publicId} href={`/account/orders/${encodeURIComponent(order.publicId)}`} className="group grid gap-3 px-4 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1.1fr_1fr_.8fr_.7fr_1fr_auto] md:items-center md:gap-4">
            <span className="font-semibold">{order.publicId}</span>
            <span className="text-sm text-muted-foreground"><span className="mr-2 md:hidden">Date</span>{formatDate(order.placedAt ?? order.createdAt)}</span>
            <span><OrderStatusBadge status={order.status} /></span>
            <span className="text-sm text-muted-foreground"><span className="mr-2 md:hidden">Items</span>{getAccountOrderItemCount(order.products)}</span>
            <span className="font-medium md:text-right">{formatPrice(order.totalCents, order.currency)}</span>
            <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" />
          </Link>
        ))}
      </div>
      {query.hasNextPage ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? <Spinner className="mr-2" /> : null}Load More</Button>
          {query.isFetchNextPageError ? <p className="text-sm text-destructive">More orders could not be loaded. Try again.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
