import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import { AdminAuthProvider } from '@/components/admin/admin-auth-provider';

export const metadata: Metadata = {
  title: {
    default: 'PopBox Studio Admin',
    template: '%s',
  },
  robots: {
    follow: false,
    index: false,
  },
};

interface IAdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout(props: IAdminLayoutProps) {
  return <AdminAuthProvider>{props.children}</AdminAuthProvider>;
}
