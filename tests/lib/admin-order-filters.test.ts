import { describe, expect, it } from 'vitest';
import {
  filterAdminOrders,
  getAdminOrderStatusCounts,
  parseAdminOrderStatusParam,
} from '@/lib/admin-order-filters';
import type { IAdminOrderListItem } from '@/interfaces/order';

const orders: IAdminOrderListItem[] = [
  {
    id: 'order-1',
    publicId: 'PBX-1001',
    status: 'pending_payment',
    totalCents: 1000,
    currency: 'CAD',
    placedAt: '2026-04-01T10:00:00.000Z',
    createdAt: '2026-04-01T10:00:00.000Z',
    customer: {
      id: 'customer-1',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Chen',
    },
  },
  {
    id: 'order-2',
    publicId: 'PBX-1002',
    status: 'paid',
    totalCents: 2000,
    currency: 'CAD',
    placedAt: '2026-04-02T10:00:00.000Z',
    createdAt: '2026-04-02T10:00:00.000Z',
    customer: {
      id: 'customer-2',
      email: 'jordan@example.com',
      firstName: 'Jordan',
      lastName: 'Lee',
    },
  },
  {
    id: 'order-3',
    publicId: 'PBX-1003',
    status: 'paid',
    totalCents: 3000,
    currency: 'CAD',
    placedAt: '2026-04-03T10:00:00.000Z',
    createdAt: '2026-04-03T10:00:00.000Z',
    customer: {
      id: 'customer-3',
      email: 'sam@example.com',
      firstName: 'Sam',
      lastName: 'Rivera',
    },
  },
];

describe('admin order filters', () => {
  it('parses only supported order statuses from URL params', () => {
    expect(parseAdminOrderStatusParam('paid')).toBe('paid');
    expect(parseAdminOrderStatusParam('delivered')).toBeUndefined();
    expect(parseAdminOrderStatusParam(undefined)).toBeUndefined();
  });

  it('builds full-dataset counts for all tabs including all', () => {
    expect(getAdminOrderStatusCounts(orders)).toEqual({
      all: 3,
      pending_payment: 1,
      paid: 2,
      packed: 0,
      shipped: 0,
      cancelled: 0,
      refunded: 0,
      paid_needs_attention: 0,
      expired: 0,
    });
  });

  it('combines status filters with case-insensitive search across ID, name, and email', () => {
    expect(filterAdminOrders(orders, {
      status: 'paid',
      query: 'jordan@example.com',
    }).map((order) => order.id)).toEqual(['order-2']);

    expect(filterAdminOrders(orders, {
      status: 'all',
      query: 'alex chen',
    }).map((order) => order.id)).toEqual(['order-1']);

    expect(filterAdminOrders(orders, {
      status: 'all',
      query: 'pbx-1003',
    }).map((order) => order.id)).toEqual(['order-3']);
  });

  it('returns all rows in the current status view when the query is empty', () => {
    expect(filterAdminOrders(orders, {
      status: 'paid',
      query: '   ',
    }).map((order) => order.id)).toEqual(['order-2', 'order-3']);
  });
});
