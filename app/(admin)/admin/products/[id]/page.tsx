import type { Metadata } from 'next';
import AdminProductDetailPageClient from '@/components/admin/product/admin-product-detail-page';

export const metadata: Metadata = {
  title: 'Product Detail — PopBox Studio Admin',
};

interface IAdminProductDetailPageProps {
  params: { id: string };
}

export default async function AdminProductDetailPage(props: IAdminProductDetailPageProps) {
  const { id } = props.params;

  return <AdminProductDetailPageClient productId={id} />;
}
