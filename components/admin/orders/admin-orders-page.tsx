'use client';

import { useRouter } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminOrderListResponse, IOrderStatus } from '@/interfaces/order';
import { formatPrice } from '@/lib/utils';
import { Package } from 'lucide-react';
import LastOnePrizeBadge from '@/components/admin/orders/last-one-prize-badge';
import { buildAdminOrderPath } from '@/utils/admin-order';

const STATUS_CONFIG: Record<IOrderStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-accent', text: 'text-foreground' },
  paid: { label: 'Paid', bg: 'bg-primary/10', text: 'text-primary' },
  packed: { label: 'Packed', bg: 'bg-muted', text: 'text-foreground' },
  shipped: { label: 'Shipped', bg: 'border border-border/60 bg-card', text: 'text-foreground' },
  cancelled: { label: 'Cancelled', bg: 'bg-muted', text: 'text-muted-foreground' },
  refunded: { label: 'Refunded', bg: 'bg-muted', text: 'text-muted-foreground' },
  paid_needs_attention: { label: 'Needs Attention', bg: 'bg-primary/15', text: 'text-primary' },
  expired: { label: 'Expired', bg: 'bg-muted', text: 'text-muted-foreground' },
};

function OrderStatusBadge({ status }: { status: IOrderStatus }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-muted',
    text: 'text-foreground',
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

export default function AdminOrdersPageClient() {
  const router = useRouter();

  const { data: fetchRes, isPending } = useCustomizeQuery<IAdminOrderListResponse>({
    queryKey: ['admin', 'orders'],
    queryFn: QueryConfigs.fetchAdminOrders,
  });

  const orders = fetchRes?.data?.data?.items ?? [];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor and process customer transactions.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/30 bg-card">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl p-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4">Order ID</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/30">
                {orders.map((order) => {
                  const customerName = [order.customer.firstName, order.customer.lastName]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => router.push(buildAdminOrderPath(order.id))}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-foreground">
                            {order.publicId}
                          </span>
                          {order.includesLastOnePrize ? <LastOnePrizeBadge /> : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{customerName || 'Guest'}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                      </td>

                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>

                      <td className="px-5 py-4 font-medium text-foreground">
                        {formatPrice(order.totalCents, order.currency)}
                      </td>

                      <td className="px-5 py-4 text-xs text-muted-foreground">
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
  );
}
