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

  if (isPending) return <div className="p-12 text-center text-muted-foreground">Loading product details...</div>;
  if (isError) return <div className="p-12 text-center text-red-500">Failed to load product.</div>;
  if (!product) return <div className="p-12 text-center text-muted-foreground">Product not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Button asChild type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border/50 text-muted-foreground">
          <Link href="/admin/products" aria-label="Back to products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{product.name}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
          <ProductCoreForm product={product} onProductChange={handleProductChange} />
          {product.productType === 'standard' && (
            <ProductInventoryForm product={product} onProductChange={handleProductChange} />
          )}
          <ProductMediaForm product={product} onProductChange={handleProductChange} />
          {product.productType === 'kuji' && (
            <ProductKujiPrizes product={product} />
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground/70 mb-1">Type</dt>
                <dd className="font-medium text-foreground capitalize">{product.productType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Status</dt>
                <dd className="font-medium text-foreground capitalize">{product.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Collections</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {product.collections.length > 0 ? (
                    product.collections.map((collection) => (
                      <span
                        key={collection.id}
                        className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        <span className="truncate">{collection.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="font-medium text-muted-foreground">No collections</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Images</dt>
                <dd className="font-medium text-foreground">{product.images.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Tags</dt>
                <dd className="font-medium text-foreground">{product.tagIds.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Created</dt>
                <dd className="font-medium text-foreground">{new Date(product.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/70 mb-1">Last Updated</dt>
                <dd className="font-medium text-foreground">{new Date(product.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
