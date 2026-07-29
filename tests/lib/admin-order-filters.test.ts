import { describe, expect, it } from 'vitest';
import {
  buildAdminOrderListQueryParams,
  buildAdminOrderListKeyParams,
  buildAdminOrdersRequestParams,
  parseAdminOrderSortParam,
  parseAdminOrderStatusParam,
} from '@/lib/admin-order-filters';
import { adminOrderKeys } from '@/lib/admin-query-keys';

describe('admin order filters', () => {
  it('parses only supported order statuses and sorts from URL params', () => {
    expect(parseAdminOrderStatusParam('paid')).toBe('paid');
    expect(parseAdminOrderStatusParam('delivered')).toBeUndefined();
    expect(parseAdminOrderStatusParam(undefined)).toBeUndefined();

    expect(parseAdminOrderSortParam('total_desc')).toBe('total_desc');
    expect(parseAdminOrderSortParam('created_desc')).toBeUndefined();
  });

  it('normalizes admin order list params with backend defaults', () => {
    expect(buildAdminOrderListQueryParams({
      search: '  jordan@example.com  ',
    })).toEqual({
      cursor: undefined,
      limit: 25,
      search: 'jordan@example.com',
      sort: 'date_desc',
      status: 'all',
    });
  });

  it('builds query keys and request params from backend-driven filters', () => {
    const filters = buildAdminOrderListQueryParams({
      cursor: 'cursor-1',
      search: 'PBX-1001',
      sort: 'total_asc',
      status: 'paid',
    });

    expect(adminOrderKeys.list(buildAdminOrderListKeyParams(filters))).toEqual([
      'admin',
      'orders',
      'list',
      {
        limit: 25,
        search: 'PBX-1001',
        sort: 'total_asc',
        status: 'paid',
      },
    ]);
    expect(buildAdminOrdersRequestParams(filters)).toEqual({
      cursor: 'cursor-1',
      limit: 25,
      search: 'PBX-1001',
      sort: 'total_asc',
      status: 'paid',
    });
  });
});
