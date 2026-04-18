'use client';

import { useParams } from 'next/navigation';
import AdminOrderDetailPageClient from '@/components/admin/orders/admin-order-detail-page';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const adminOrderId = typeof params.id === 'string' ? params.id : '';

  return <AdminOrderDetailPageClient adminOrderId={adminOrderId} />;
}
