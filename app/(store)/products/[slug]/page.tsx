'use client';

import useCustomizeQuery from '@/hooks/use-customize-query';
import QueryConfigs from '@/configs/api/query-config';
import { IProduct } from '@/interfaces/product';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductActions } from '@/components/product/product-actions';
import { KujiPrizesView } from '@/components/product/kuji-prizes-view';
import { Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/helpers';
import { useParams } from 'next/navigation';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const { data: response, isPending, isError } = useCustomizeQuery<IProduct>({
    queryKey: ['product', slug],
    queryFn: () => QueryConfigs.fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  const product = response?.data?.data;

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Product Not Found</h1>
        <p className="text-muted-foreground text-lg">We couldn&apos;t find what you&apos;re looking for.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* Left Column - Gallery */}
        <div className="sticky top-24">
          <ProductGallery product={product} />
        </div>

        {/* Right Column - Details */}
        <div className="flex flex-col">
          {product.collection && (
            <div className="text-sm font-semibold tracking-wider uppercase text-primary mb-3">
              {product.collection.name}
            </div>
          )}
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(product.priceCents, product.currency)}
            </span>
            {product.productType === 'kuji' && (
              <span className="text-sm text-muted-foreground">per ticket</span>
            )}
          </div>

          <div className="prose prose-slate dark:prose-invert text-muted-foreground mb-8 border-b border-border/50 pb-8">
            <p className="text-lg leading-relaxed">{product.description || 'No description available.'}</p>
          </div>

          <ProductActions product={product} />

          {product.productType === 'kuji' && (
            <div className="mt-8 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <p className="text-sm font-medium text-secondary-foreground">
                <span className="font-bold uppercase tracking-wider block mb-1">How Ichiban Kuji Works:</span>
                Each ticket guarantees you a prize from this lineup! Purchase the quantity of tickets you want, check out, and you will be able to reveal your prizes instantly.
              </p>
            </div>
          )}
        </div>
      </div>

      {product.productType === 'kuji' && product.kujiPrizes && (
        <KujiPrizesView prizes={product.kujiPrizes} />
      )}
    </div>
  );
}
