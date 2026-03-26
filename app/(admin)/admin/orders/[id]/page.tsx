import type { Metadata } from 'next';
import AdminOrderDetailPageClient from '@/components/admin/orders/admin-order-detail-page';

export const metadata: Metadata = {
  title: 'Order Detail — PopBox Studio Admin',
};

interface IAdminOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage(props: IAdminOrderDetailPageProps) {
  const { id } = await props.params;
  return <AdminOrderDetailPageClient orderId={id} />;
}
