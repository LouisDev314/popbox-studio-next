export const customerStorageState = 'tests/e2e/.auth/customer.json';
export const adminStorageState = 'tests/e2e/.auth/admin.json';

export const deterministicAuthSubjects = {
  customer: '00000000-0000-4000-8000-000000000001',
  admin: '00000000-0000-4000-8000-000000000002',
  expired: '00000000-0000-4000-8000-000000000003',
  refresh: '00000000-0000-4000-8000-000000000004',
} as const;
