import type { Metadata } from 'next';
import AdminOrdersPageClient from '@/components/admin/orders/admin-orders-page';

export const metadata: Metadata = {
  title: 'Orders — PopBox Studio Admin',
};

export default function AdminOrdersPage() {
  return <AdminOrdersPageClient />;
}
