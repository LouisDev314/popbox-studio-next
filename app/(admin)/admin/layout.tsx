import { type ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

interface IAdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout(props: IAdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F7F9FB]">
      <AdminSidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col md:ml-60">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
}
