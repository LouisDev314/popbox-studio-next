import type { IAdminOrderListItem, IOrderStatus } from '@/interfaces/order';

export type AdminOrderStatusFilter = IOrderStatus | 'all';

export const ADMIN_ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: AdminOrderStatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Pending Payment', value: 'pending_payment' },
  { label: 'Paid', value: 'paid' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Needs Attention', value: 'paid_needs_attention' },
  { label: 'Expired', value: 'expired' },
] as const;

const ADMIN_ORDER_STATUS_VALUES = new Set<IOrderStatus>(
  ADMIN_ORDER_STATUS_OPTIONS
    .filter((option) => option.value !== 'all')
    .map((option) => option.value as IOrderStatus),
);

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

export function getAdminOrderCustomerName(order: IAdminOrderListItem) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
}

export function parseAdminOrderStatusParam(
  value: string | null | undefined,
): IOrderStatus | undefined {
  if (!value) {
    return undefined;
  }

  return ADMIN_ORDER_STATUS_VALUES.has(value as IOrderStatus)
    ? value as IOrderStatus
    : undefined;
}

export function getAdminOrderStatusCounts(
  orders: IAdminOrderListItem[],
): Record<AdminOrderStatusFilter, number> {
  const counts = Object.fromEntries(
    ADMIN_ORDER_STATUS_OPTIONS.map((option) => [option.value, 0]),
  ) as Record<AdminOrderStatusFilter, number>;

  counts.all = orders.length;

  for (const order of orders) {
    counts[order.status] += 1;
  }

  return counts;
}

export function matchesAdminOrderSearch(
  order: IAdminOrderListItem,
  query: string,
) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    order.publicId,
    order.customer.email,
    getAdminOrderCustomerName(order),
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

export function filterAdminOrders(
  orders: IAdminOrderListItem[],
  {
    query,
    status,
  }: {
    query?: string;
    status?: AdminOrderStatusFilter;
  },
) {
  const normalizedQuery = normalizeSearchValue(query);

  return orders.filter((order) => {
    if (status && status !== 'all' && order.status !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return matchesAdminOrderSearch(order, normalizedQuery);
  });
}
