import type { IAdminOrderListItem, IOrderStatus } from '@/interfaces/order';

export type AdminOrderStatusFilter = IOrderStatus | 'all';
export type AdminOrderSort = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';

export interface IAdminOrderListQueryParams {
  cursor?: string;
  limit?: number;
  search?: string;
  sort: AdminOrderSort;
  status: AdminOrderStatusFilter;
}

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

export const ADMIN_ORDER_SORT_OPTIONS: Array<{
  label: string;
  value: AdminOrderSort;
}> = [
  { label: 'Newest first', value: 'date_desc' },
  { label: 'Oldest first', value: 'date_asc' },
  { label: 'Total: high to low', value: 'total_desc' },
  { label: 'Total: low to high', value: 'total_asc' },
] as const;

export const ADMIN_ORDER_DEFAULT_STATUS: AdminOrderStatusFilter = 'all';
export const ADMIN_ORDER_DEFAULT_SORT: AdminOrderSort = 'date_desc';
export const ADMIN_ORDER_LIST_LIMIT = 25;

const ADMIN_ORDER_STATUS_VALUES = new Set<IOrderStatus>(
  ADMIN_ORDER_STATUS_OPTIONS
    .filter((option) => option.value !== 'all')
    .map((option) => option.value as IOrderStatus),
);
const ADMIN_ORDER_SORT_VALUES = new Set<AdminOrderSort>(
  ADMIN_ORDER_SORT_OPTIONS.map((option) => option.value),
);

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim() ?? '';
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

export function parseAdminOrderSortParam(
  value: string | null | undefined,
): AdminOrderSort | undefined {
  if (!value) {
    return undefined;
  }

  return ADMIN_ORDER_SORT_VALUES.has(value as AdminOrderSort)
    ? value as AdminOrderSort
    : undefined;
}

export function buildAdminOrderListQueryParams(filters: {
  cursor?: string | null;
  limit?: number;
  search?: string | null;
  sort?: AdminOrderSort | null;
  status?: AdminOrderStatusFilter | null;
}): IAdminOrderListQueryParams {
  return {
    cursor: normalizeSearchValue(filters.cursor) || undefined,
    limit: filters.limit ?? ADMIN_ORDER_LIST_LIMIT,
    search: normalizeSearchValue(filters.search) || undefined,
    sort: filters.sort ?? ADMIN_ORDER_DEFAULT_SORT,
    status: filters.status ?? ADMIN_ORDER_DEFAULT_STATUS,
  };
}

export function buildAdminOrdersQueryKey(filters: IAdminOrderListQueryParams) {
  return [
    'admin',
    'orders',
    filters.search ?? '',
    filters.status,
    filters.sort,
    filters.cursor ?? '',
    filters.limit ?? ADMIN_ORDER_LIST_LIMIT,
  ] as const;
}

export function buildAdminOrdersRequestParams(filters: IAdminOrderListQueryParams) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    status: filters.status,
    sort: filters.sort,
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    limit: filters.limit ?? ADMIN_ORDER_LIST_LIMIT,
  };
}
