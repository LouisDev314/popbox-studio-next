import { redirect } from 'next/navigation';

/**
 * Admin landing page — redirects to the products list as the default admin view.
 * A catalog-first admin has no need for a generic dashboard.
 */
export default function AdminPage() {
  redirect('/admin/products');
}
