'use client';

import { useParams } from 'next/navigation';
import AdminProductDetailPageClient from '@/components/admin/product/admin-product-detail-page';

export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';

  return <AdminProductDetailPageClient productId={productId} />;
}
