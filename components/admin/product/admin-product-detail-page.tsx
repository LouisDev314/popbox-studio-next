'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { Button } from '@/components/ui/button';
import { IAdminProductDetail, IAdminProductEditor } from '@/interfaces/product';
import { mapAdminProductDetailToEditor } from '@/utils/admin';

import { ProductCoreForm } from './product-core-form';
import { ProductInventoryForm } from './product-inventory-form';
import { ProductMediaForm } from './product-media-form';
import { ProductKujiPrizes } from './product-kuji-prizes';

export default function AdminProductDetailPageClient({ productId }: { productId: string }) {
  const [productOverride, setProductOverride] = useState<IAdminProductEditor | null>(null);

  const { data: productRes, isPending, isError } = useCustomizeQuery<IAdminProductDetail>({
    queryKey: ['admin', 'product', productId],
    queryFn: () => QueryConfigs.fetchAdminProduct(productId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const hydratedProduct = useMemo(() => {
    const detail = productRes?.data?.data;

    return detail ? mapAdminProductDetailToEditor(detail) : null;
  }, [productRes]);

  const handleProductChange: Dispatch<SetStateAction<IAdminProductEditor | null>> = (value) => {
    setProductOverride((currentProduct) => {
      const scopedCurrentProduct = currentProduct?.id === productId ? currentProduct : null;
      const nextProduct = typeof value === 'function' ? value(scopedCurrentProduct) : value;

      return nextProduct?.id === productId ? nextProduct : null;
    });
  };

  const product = productOverride?.id === productId ? productOverride : hydratedProduct;

  if (isPending) return <div className="p-12 text-center text-[#514349]">Loading product details...</div>;
  if (isError) return <div className="p-12 text-center text-red-500">Failed to load product.</div>;
  if (!product) return <div className="p-12 text-center text-[#514349]">Product not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-4">
        <Button asChild type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-[#D5C1C9]/50 text-[#514349]">
          <Link href="/admin/products" aria-label="Back to products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">{product.name}</h1>
          <p className="mt-1 text-sm text-[#514349]">Manage product details, inventory, media, and tags.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <ProductCoreForm key={product.id} product={product} onProductChange={handleProductChange} />
          {product.productType === 'standard' && (
            <ProductInventoryForm key={product.id} product={product} onProductChange={handleProductChange} />
          )}
          <ProductMediaForm product={product} onProductChange={handleProductChange} />
          {product.productType === 'kuji' && (
            <ProductKujiPrizes product={product} />
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#514349]">Summary</h2>
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
                <dt className="text-[#514349]/70 mb-1">Collection</dt>
                <dd className="font-medium text-[#191C1E]">{product.collection?.name ?? 'None'}</dd>
              </div>
              <div>
                <dt className="text-[#514349]/70 mb-1">Images</dt>
                <dd className="font-medium text-[#191C1E]">{product.images.length}</dd>
              </div>
              <div>
                <dt className="text-[#514349]/70 mb-1">Tags</dt>
                <dd className="font-medium text-[#191C1E]">{product.tagIds.length}</dd>
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
