import type { Metadata } from 'next';
import AdminOrderDetailPageClient from '@/components/admin/orders/admin-order-detail-page';

export const metadata: Metadata = {
  title: 'Order Detail — PopBox Studio Admin',
};

interface IAdminOrderDetailPageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage(props: IAdminOrderDetailPageProps) {
  const { id } = props.params;
  return <AdminOrderDetailPageClient orderId={id} />;
}
