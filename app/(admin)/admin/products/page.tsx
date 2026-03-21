import type { Metadata } from 'next';
import { Suspense } from 'react';
import AdminProductsPage from '@/components/admin/admin-products-page';

export const metadata: Metadata = {
  title: 'Products — PopBox Studio Admin',
};

export default function AdminProductsRoute() {
  return (
    <Suspense>
      <AdminProductsPage />
    </Suspense>
  );
}
