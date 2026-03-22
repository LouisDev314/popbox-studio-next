import type { Metadata } from 'next';
import AdminTagsPageClient from '@/components/admin/tags/admin-tags-page';

export const metadata: Metadata = {
  title: 'Tags — PopBox Studio Admin',
};

export default function AdminTagsPage() {
  return <AdminTagsPageClient />;
}
