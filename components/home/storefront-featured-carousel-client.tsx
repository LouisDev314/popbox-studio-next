import { StorefrontCarousel } from '@/components/home/storefront-carousel';
import type { IProductCard } from '@/interfaces/product';

interface IStorefrontFeaturedCarouselClientProps {
  featuredProducts: IProductCard[];
}

export function StorefrontFeaturedCarouselClient(props: IStorefrontFeaturedCarouselClientProps) {
  if (props.featuredProducts.length === 0) {
    return null;
  }

  return <StorefrontCarousel featuredProducts={props.featuredProducts} />;
}
