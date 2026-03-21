'use client';

import { useRouter } from 'next/navigation';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminOrderListResponse, IOrderStatus } from '@/interfaces/order';
import { formatPrice } from '@/lib/utils';
import { Package } from 'lucide-react';

const STATUS_CONFIG: Record<IOrderStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' },
  packed: { label: 'Packed', bg: 'bg-blue-100', text: 'text-blue-800' },
  shipped: { label: 'Shipped', bg: 'bg-purple-100', text: 'text-purple-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
  refunded: { label: 'Refunded', bg: 'bg-gray-100', text: 'text-gray-800' },
  paid_needs_attention: { label: 'Needs Attention', bg: 'bg-orange-100', text: 'text-orange-800' },
  expired: { label: 'Expired', bg: 'bg-gray-100', text: 'text-gray-500' },
};

function OrderStatusBadge({ status }: { status: IOrderStatus }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${config.bg} ${config.text}`}
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
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Orders</h1>
          <p className="mt-1 text-sm text-[#514349]">Monitor and process customer transactions.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#D5C1C9]/30 bg-white">
        {isPending ? (
          <div className="p-8 text-center text-sm text-[#514349]">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl p-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-[#514349]">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#D5C1C9]/30 bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wider text-[#514349]">
                  <th className="px-5 py-4">Order ID</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#D5C1C9]/30">
                {orders.map((order) => {
                  const customerName = [order.customer.firstName, order.customer.lastName]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <td className="px-5 py-4 font-mono text-sm font-medium text-[#191C1E]">
                        {order.publicId}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-[#191C1E]">{customerName || 'Guest'}</div>
                        <div className="text-xs text-[#514349]">{order.customer.email}</div>
                      </td>

                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>

                      <td className="px-5 py-4 font-medium text-[#191C1E]">
                        {formatPrice(order.totalCents, order.currency)}
                      </td>

                      <td className="px-5 py-4 text-xs text-[#514349]">
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
