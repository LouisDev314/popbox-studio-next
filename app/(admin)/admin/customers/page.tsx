import type { Metadata } from 'next';
import AdminCustomersPageClient from '@/components/admin/customers/admin-customers-page';

export const metadata: Metadata = {
  title: 'Customers — PopBox Studio Admin',
};

export default function AdminCustomersPage() {
  return <AdminCustomersPageClient />;
}
