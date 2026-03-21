import { type ReactNode } from 'react';
import { AdminAuthProvider } from '@/components/admin/admin-auth-provider';

interface IAdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout(props: IAdminLayoutProps) {
  return <AdminAuthProvider>{props.children}</AdminAuthProvider>;
}
