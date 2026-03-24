import type { Metadata } from 'next';
import { AdminLegalListPage } from '@/components/admin/legal/admin-legal-list-page';

export const metadata: Metadata = {
  title: 'Legal Documents - Admin',
};

export default function AdminLegalPage() {
  return <AdminLegalListPage />;
}
