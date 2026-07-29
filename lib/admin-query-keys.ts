import type { IAdminOrderListQueryParams } from '@/lib/admin-order-filters';
import type { IAdminProductListQueryParams } from '@/lib/admin-product-filters';

export type AdminProductListKeyParams = Omit<IAdminProductListQueryParams, 'cursor'>;
export type AdminOrderListKeyParams = Omit<IAdminOrderListQueryParams, 'cursor'>;

const adminRoot = ['admin'] as const;

export const adminProductKeys = {
  all: [...adminRoot, 'products'] as const,
  lists: () => [...adminProductKeys.all, 'list'] as const,
  list: (params: AdminProductListKeyParams) => [...adminProductKeys.lists(), params] as const,
  details: () => [...adminProductKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminProductKeys.details(), id] as const,
};

export const adminOrderKeys = {
  all: [...adminRoot, 'orders'] as const,
  lists: () => [...adminOrderKeys.all, 'list'] as const,
  list: (params: AdminOrderListKeyParams) => [...adminOrderKeys.lists(), params] as const,
  details: () => [...adminOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminOrderKeys.details(), id] as const,
};

export const adminCollectionKeys = {
  all: [...adminRoot, 'collections'] as const,
  list: () => [...adminCollectionKeys.all, 'list'] as const,
  featuredOrder: () => [...adminCollectionKeys.all, 'featured', 'order'] as const,
};

export const adminTagKeys = {
  all: [...adminRoot, 'tags'] as const,
  list: () => [...adminTagKeys.all, 'list'] as const,
};

export const adminPrizeKeys = {
  all: [...adminRoot, 'prizes'] as const,
  byProduct: (productId: string) => [...adminPrizeKeys.all, productId] as const,
};
