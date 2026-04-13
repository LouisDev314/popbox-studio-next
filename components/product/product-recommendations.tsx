import { ProductGridDense, ProductGridDenseSkeleton } from '@/components/product/product-grid-dense';
import { type IProduct, type IProductCard } from '@/interfaces/product';
import { getPublicProductRecommendations } from '@/lib/api/public-storefront';

const RELATED_PRODUCTS_LIMIT = 4;

interface IProductRecommendationsProps {
  product: IProduct;
}

export function ProductRecommendationsFallback() {
  return (
    <section className="mt-32 border-t border-border/60 pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          You might also like
        </h2>
      </div>

      <ProductGridDenseSkeleton className="mt-6 sm:mt-8" count={RELATED_PRODUCTS_LIMIT} />
    </section>
  );
}

export async function ProductRecommendations(props: IProductRecommendationsProps) {
  if (!props.product.slug) {
    return null;
  }

  let relatedProducts: IProductCard[] = [];

  try {
    const recommendations = await getPublicProductRecommendations(props.product.slug);
    relatedProducts = recommendations.items
      .filter((item) => item.id !== props.product.id)
      .slice(0, RELATED_PRODUCTS_LIMIT);
  } catch {
    return null;
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-28 border-t border-border/60 pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          You might also like
        </h2>
      </div>

      <ProductGridDense
        products={relatedProducts}
        className="mt-6 sm:mt-8"
        priorityCount={4}
      />
    </section>
  );
}
