import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { KujiPrizesView } from '@/components/product/kuji-prizes-view';
import { ProductActions } from '@/components/product/product-actions';
import { ProductGallery } from '@/components/product/product-gallery';
import {
  ProductRecommendations,
  ProductRecommendationsFallback,
} from '@/components/product/product-recommendations';
import { type IProduct } from '@/interfaces/product';
import { getPublicProductBySlug, isPublicApiNotFoundError } from '@/lib/api/public-storefront';
import { formatPrice } from '@/lib/utils';

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  props: ProductDetailPageProps,
): Promise<Metadata> {
  const params = await props.params;

  try {
    const product = await getPublicProductBySlug(params.slug);

    return {
      title: `${product.name} - PopBox Studio`,
      description:
        product.description ||
        `Shop ${product.name} at PopBox Studio.`,
    };
  } catch {
    return {
      title: 'Product - PopBox Studio',
    };
  }
}

function ProductUnavailableState() {
  return (
    <div className="container mx-auto px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-4xl border border-dashed border-border/70 bg-card px-8 py-14 shadow-sm">
        <h1 className="text-3xl font-bold text-destructive">Failed to load product</h1>
        <p className="mt-3 text-base text-muted-foreground">
          The requested product is temporarily unavailable. Please try again shortly.
        </p>
        <Button asChild className="mt-8 rounded-full px-6">
          <Link href="/products">Back to products</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function ProductDetailPage(props: ProductDetailPageProps) {
  const params = await props.params;
  let product: IProduct;

  try {
    product = await getPublicProductBySlug(params.slug);
  } catch (error) {
    if (isPublicApiNotFoundError(error)) {
      notFound();
    }

    return (
      <ProductUnavailableState />
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
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-end gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(product.priceCents, product.currency)}
            </span>
            {product.productType === 'kuji' ? (
              <span className="text-sm text-muted-foreground">per ticket</span>
            ) : null}
          </div>

          <ProductActions product={product} />

          {product.productType === 'kuji' ? (
            <div className="mt-12 rounded-[1.75rem] border border-secondary/25 bg-secondary/10 p-5">
              <p className="text-sm font-medium text-secondary-foreground">
                <span className="mb-1 block font-bold uppercase tracking-wider">How Ichiban Kuji Works</span>
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

      <div className="mt-12 rounded-4xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Product details</p>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {product.description || 'No description available.'}
        </p>
      </div>

      <Suspense fallback={<ProductRecommendationsFallback />}>
        <ProductRecommendations product={product} />
      </Suspense>
    </div>
  );
}
