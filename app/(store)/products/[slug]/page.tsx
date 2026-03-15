'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { KujiPrizesView } from '@/components/product/kuji-prizes-view';
import { ProductActions } from '@/components/product/product-actions';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductRecommendations } from '@/components/product/product-recommendations';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { type IProduct } from '@/interfaces/product';
import { formatPrice } from '@/utils/helpers';

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
      <div className="container mx-auto w-full px-4 py-12 sm:px-6 lg:px-8 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16">
          <div className="aspect-square rounded-[2rem] bg-muted/35" />
          <div className="space-y-5">
            <div className="h-4 w-24 rounded-full bg-muted/35" />
            <div className="h-10 rounded-full bg-muted/35" />
            <div className="h-6 w-32 rounded-full bg-muted/25" />
            <div className="h-28 rounded-[2rem] bg-muted/25" />
            <div className="h-40 rounded-[2rem] bg-muted/35" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-border/70 bg-card px-8 py-14 shadow-sm">
          <h1 className="text-3xl font-bold text-destructive">Product Not Found</h1>
          <p className="mt-3 text-base text-muted-foreground">
            We couldn&apos;t find the requested product. It may have moved, sold out, or been removed from the storefront.
          </p>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link href="/products">Back to products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="relative z-10 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {product.collection ? (
              <div className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {product.collection.name}
              </div>
            ) : null}
            {product.productType === 'kuji' ? (
              <div className="rounded-full bg-secondary/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                Ichiban Kuji
              </div>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(product.priceCents, product.currency)}
            </span>
            {product.productType === 'kuji' ? (
              <span className="text-sm text-muted-foreground">per ticket</span>
            ) : null}
          </div>

          <div className="mt-8 rounded-[2rem] border border-border/60 bg-card/70 p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Product details</p>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              {product.description || 'No description available.'}
            </p>
          </div>

          <ProductActions product={product} />

          {product.productType === 'kuji' ? (
            <div className="mt-8 rounded-[1.75rem] border border-secondary/25 bg-secondary/10 p-5">
              <p className="text-sm font-medium text-secondary-foreground">
                <span className="mb-1 block font-bold uppercase tracking-[0.22em]">How Ichiban Kuji Works</span>
                Each ticket guarantees a prize from this lineup. Purchase the quantity of tickets you want, check out,
                and reveal your prizes after payment.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {product.productType === 'kuji' && product.kujiPrizes ? (
        <KujiPrizesView prizes={product.kujiPrizes} />
      ) : null}

      <ProductRecommendations product={product} />
    </div>
  );
}
