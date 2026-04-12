import type { IAdminCustomer } from '@/interfaces/customer';

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

export function getAdminCustomerName(customer: IAdminCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ');
}

export function matchesAdminCustomerSearch(
  customer: IAdminCustomer,
  query: string,
) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    customer.email,
    getAdminCustomerName(customer),
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

export function filterAdminCustomersBySearch(
  customers: IAdminCustomer[],
  {
    query,
  }: {
    query?: string;
  },
) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return customers;
  }

  return customers.filter((customer) => matchesAdminCustomerSearch(customer, normalizedQuery));
}
