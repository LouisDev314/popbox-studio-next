import { ProductCarousel, ProductCarouselSkeleton } from '@/components/product/product-carousel';
import { ProductTileDense } from '@/components/product/product-tile-dense';
import { type IProduct, type IProductCard } from '@/interfaces/product';
import { getPublicProductRecommendations } from '@/lib/api/public-storefront';

const RELATED_PRODUCTS_LIMIT = 4;

interface IProductRecommendationsProps {
  product: IProduct;
}

export function ProductRecommendationsFallback() {
  return (
    <section className="mt-28 border-t border-border/60 pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          You might also like
        </h2>
      </div>

      <ProductCarouselSkeleton className="mt-6 sm:mt-8" count={RELATED_PRODUCTS_LIMIT} />
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

      <ProductCarousel
        items={relatedProducts}
        className="mt-6 sm:mt-8"
        ariaLabel="Recommended products"
        getItemKey={(product) => product.id}
        renderItem={(product, index) => (
          <ProductTileDense
            product={product}
            priority={index < RELATED_PRODUCTS_LIMIT}
            sizes="(max-width: 640px) 46vw, (max-width: 768px) 31vw, (max-width: 1200px) 23vw, 15vw"
          />
        )}
      />
    </section>
  );
}
