import { ProductCard } from '@/components/product/product-card';
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

      <div className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: RELATED_PRODUCTS_LIMIT }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card p-4">
            <div className="aspect-square rounded-[1.4rem] bg-muted/35" />
            <div className="mt-4 h-5 rounded-full bg-muted/35" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-muted/25" />
            <div className="mt-6 h-5 w-1/3 rounded-full bg-muted/35" />
          </div>
        ))}
      </div>
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
    <section className="mt-32 border-t border-border/60 pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          You might also like
        </h2>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {relatedProducts.map((relatedProduct: IProductCard) => (
          <ProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </section>
  );
}
