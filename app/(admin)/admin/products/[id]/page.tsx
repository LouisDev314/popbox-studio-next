import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Product Detail — PopBox Studio Admin',
};

interface IAdminProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductDetailPage(props: IAdminProductDetailPageProps) {
  const { id } = await props.params;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/products"
          className="text-sm text-[#514349] transition-colors hover:text-[#191C1E]"
        >
          ← Back to Products
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Product Detail</h1>
      <p className="mt-1 text-sm text-[#514349]">
        Product ID: <code className="rounded bg-[#E6E8EA] px-1.5 py-0.5 text-xs">{id}</code>
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-[#D5C1C9]/40 bg-white px-6 py-12 text-center">
        <p className="text-sm text-[#514349]">
          Product editing will be implemented in a future task.
        </p>
      </div>
    </div>
  );
}
