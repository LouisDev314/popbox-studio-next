'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { IAdminProductListResponse } from '@/interfaces/product';

import { ProductCoreForm } from './product-core-form';
import { ProductInventoryForm } from './product-inventory-form';
import { ProductMediaForm } from './product-media-form';
import { ProductKujiPrizes } from './product-kuji-prizes';

export default function AdminProductDetailPageClient({ productId }: { productId: string }) {
  const { data: productsRes, isPending, isError } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey: ['admin', 'products'],
    queryFn: () => QueryConfigs.fetchAdminProducts(),
  });

  const product = useMemo(() => {
    return productsRes?.data?.data?.items?.find((p) => p.id === productId);
  }, [productsRes, productId]);

  if (isPending) return <div className="p-12 text-center text-[#514349]">Loading product details...</div>;
  if (isError) return <div className="p-12 text-center text-red-500">Failed to load product.</div>;
  if (!product) return <div className="p-12 text-center text-[#514349]">Product not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D5C1C9]/50 bg-white text-[#514349] transition-colors hover:bg-[#F2F4F6]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">{product.name}</h1>
          <p className="mt-1 text-sm text-[#514349]">Manage product details, inventory, and media.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Forms */}
        <div className="lg:col-span-2 space-y-8">
          <ProductCoreForm product={product} />
          {product.productType === 'standard' && (
            <ProductInventoryForm product={product} />
          )}
          <ProductMediaForm product={product} />
          {product.productType === 'kuji' && (
            <ProductKujiPrizes product={product} />
          )}
        </div>
        
        {/* Sidebar info */}
        <div className="space-y-8 flex flex-col">
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold text-[#514349] uppercase tracking-wider">Summary</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[#514349]/70 mb-1">Type</dt>
                <dd className="font-medium text-[#191C1E] capitalize">{product.productType}</dd>
              </div>
              <div>
                <dt className="text-[#514349]/70 mb-1">Status</dt>
                <dd className="font-medium text-[#191C1E] capitalize">{product.status}</dd>
              </div>
              <div>
                <dt className="text-[#514349]/70 mb-1">Created</dt>
                <dd className="font-medium text-[#191C1E]">{new Date(product.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-[#514349]/70 mb-1">Last Updated</dt>
                <dd className="font-medium text-[#191C1E]">{new Date(product.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
