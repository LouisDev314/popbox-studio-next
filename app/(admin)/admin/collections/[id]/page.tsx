'use client';

import { useParams } from 'next/navigation';
import AdminCollectionDetailPageClient from '@/components/admin/collections/admin-collection-detail-page';

export default function AdminCollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const collectionId = typeof params.id === 'string' ? params.id : '';

  return <AdminCollectionDetailPageClient collectionId={collectionId} />;
}
