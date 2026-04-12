import { describe, expect, it } from 'vitest';
import { filterAdminCustomersBySearch } from '@/lib/admin-customer-filters';
import type { IAdminCustomer } from '@/interfaces/customer';

const customers: IAdminCustomer[] = [
  {
    id: 'customer-1',
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Chen',
    phone: '111-111-1111',
    orderCount: 2,
    totalSpentCents: 4000,
    createdAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'customer-2',
    email: 'jordan@example.com',
    firstName: 'Jordan',
    lastName: 'Lee',
    phone: '222-222-2222',
    orderCount: 1,
    totalSpentCents: 2000,
    createdAt: '2026-04-02T10:00:00.000Z',
  },
];

describe('admin customer filters', () => {
  it('matches customers by name and email', () => {
    expect(filterAdminCustomersBySearch(customers, {
      query: 'alex chen',
    }).map((customer) => customer.id)).toEqual(['customer-1']);

    expect(filterAdminCustomersBySearch(customers, {
      query: 'JORDAN@EXAMPLE.COM',
    }).map((customer) => customer.id)).toEqual(['customer-2']);
  });

  it('does not match phone numbers', () => {
    expect(filterAdminCustomersBySearch(customers, {
      query: '111-111-1111',
    })).toEqual([]);
  });

  it('returns all customers when the query is empty', () => {
    expect(filterAdminCustomersBySearch(customers, {
      query: '   ',
    }).map((customer) => customer.id)).toEqual(['customer-1', 'customer-2']);
  });
});
