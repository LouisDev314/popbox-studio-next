import { ICollection } from '@/interfaces/product';

export interface IStoreCollectionNavItem {
  description: string;
  href: string;
  label: string;
}

export const DESKTOP_PRIMARY_NAV_ITEMS = [
  { href: '/products', label: 'Shop All' },
  { href: '/products?type=kuji', label: 'Ichiban Kuji' },
] as const;

export const MOBILE_PRIMARY_NAV_ITEMS: IStoreCollectionNavItem[] = [
  {
    label: 'Home',
    href: '/home',
    description: 'Featured drops, recent releases, and storefront highlights.',
  },
  {
    label: 'Shop All',
    href: '/products',
    description: 'Browse every figure, collectible, and PopBox Studio release.',
  },
  {
    label: 'Ichiban Kuji',
    href: '/products?type=kuji',
    description: 'Premium lottery-style prizes and ticket-based launches.',
  },
];

export function mapCollectionToNavItem(collection: ICollection): IStoreCollectionNavItem {
  return {
    label: collection.name,
    href: `/products?collection=${encodeURIComponent(collection.slug)}`,
    description: `Browse the ${collection.name} collection.`,
  };
}
