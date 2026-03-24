import type { Metadata } from 'next';
import { AdminLegalEditorPage } from '@/components/admin/legal/admin-legal-editor-page';

export const metadata: Metadata = {
  title: 'Edit Legal Document - Admin',
};

export default function AdminLegalEditRoute() {
  return <AdminLegalEditorPage />;
}
