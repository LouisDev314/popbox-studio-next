import { IProductCard } from './product';

export interface IHomepageData {
  featured: IProductCard[];
  trendingNow: IProductCard[];
  allProductsPreview: IProductCard[];
}
