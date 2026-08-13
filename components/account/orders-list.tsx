'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { AccountProductIdentity } from '@/components/account/account-product-identity';
import { getAccountOrderItemCount, OrderStatusBadge } from '@/components/account/order-status-badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import QueryConfigs from '@/configs/api/query-config';
import type { IAccountOrderListPage } from '@/interfaces/account';
import { cn, formatPrice } from '@/lib/utils';

const orderGridColumns = 'md:grid-cols-[minmax(9.5rem,1.15fr)_minmax(0,1.9fr)_minmax(7.5rem,.85fr)_minmax(6.75rem,.75fr)_minmax(3.5rem,.4fr)_minmax(6.5rem,.7fr)]';

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
      <div data-testid="orders-header" className={cn('hidden gap-4 border-b border-border px-4 pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid', orderGridColumns)}>
        <span>Order</span><span>Products</span><span>Date</span><span>Status</span><span>Items</span><span className="text-right">Total</span>
      </div>
      <div className="divide-y divide-border">
        {orders.map((order) => (
          <Link
            key={order.publicId}
            data-testid={`order-row-${order.publicId}`}
            href={`/account/orders/${encodeURIComponent(order.publicId)}`}
            className={cn(
              'group/order grid min-h-24 cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 px-4 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:items-center md:gap-4 md:py-4',
              orderGridColumns,
            )}
          >
            <span className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-2 font-semibold transition-colors group-hover/order:text-primary md:col-auto md:row-auto">
              <span className="min-w-0 truncate">{order.publicId}</span>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover/order:translate-x-0.5" aria-hidden="true" />
            </span>
            <div className="col-span-2 row-start-2 min-w-0 space-y-2 md:col-auto md:row-auto">
              {order.products.slice(0, 2).map((product) => (
                <AccountProductIdentity
                  key={`${product.productId}:${product.variantId ?? 'product'}`}
                  size="compact"
                  name={product.productName}
                  productSlug={product.productSlug}
                  isStorefrontAccessible={product.isStorefrontAccessible}
                  imageUrl={product.imageUrl}
                  imageAltText={product.imageAltText}
                  variantName={product.variantName}
                  variantSku={product.variantSku}
                  storefrontLinkEnabled={false}
                />
              ))}
              {order.products.length > 2 ? (
                <p className="text-xs text-muted-foreground">+{order.products.length - 2} more</p>
              ) : null}
            </div>
            <span className="col-span-2 row-start-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground md:contents">
              <span className="md:text-nowrap">
                <span className="sr-only">Order date: </span>
                {formatDate(order.placedAt ?? order.createdAt)}
              </span>
              <span aria-hidden="true" className="md:hidden">·</span>
              <span className="flex items-center"><OrderStatusBadge status={order.status} /></span>
              <span aria-hidden="true" className="md:hidden">·</span>
              <span className="md:text-center">
                {getAccountOrderItemCount(order.products)}<span className="md:sr-only"> items</span>
              </span>
            </span>
            <span className="col-start-2 row-start-1 text-right font-medium tabular-nums md:col-auto md:row-auto">
              <span className="sr-only">Total: </span>
              {formatPrice(order.totalCents, order.currency)}
            </span>
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
