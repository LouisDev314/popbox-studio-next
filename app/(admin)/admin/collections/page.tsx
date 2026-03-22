import type { Metadata } from 'next';
import AdminCollectionsPageClient from '@/components/admin/collections/admin-collections-page';

export const metadata: Metadata = {
  title: 'Collections — PopBox Studio Admin',
};

export default function AdminCollectionsPage() {
  return <AdminCollectionsPageClient />;
}
