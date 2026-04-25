import {
  FileText,
  LayoutGrid,
  Megaphone,
  Package,
  Truck,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface IAdminNavItem {
  group: 'Catalog' | 'Sales' | 'Content' | 'Settings';
  href: string;
  icon: LucideIcon;
  label: string;
  matches: (pathname: string) => boolean;
}

function matchesAdminPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ADMIN_NAV_ITEMS: IAdminNavItem[] = [
  {
    label: 'Products',
    href: '/admin/products',
    group: 'Catalog',
    icon: Package,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/products'),
  },
  {
    label: 'Collections',
    href: '/admin/collections',
    group: 'Catalog',
    icon: LayoutGrid,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/collections'),
  },
  {
    label: 'Tags',
    href: '/admin/tags',
    group: 'Catalog',
    icon: Tags,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/tags'),
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    group: 'Sales',
    icon: ShoppingCart,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/orders'),
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    group: 'Sales',
    icon: Users,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/customers'),
  },
  {
    label: 'Legal & FAQ',
    href: '/admin/legal',
    group: 'Content',
    icon: FileText,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/legal'),
  },
  {
    label: 'Shipping',
    href: '/admin/settings/shipping',
    group: 'Settings',
    icon: Truck,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/settings/shipping'),
  },
  {
    label: 'Store Banner',
    href: '/admin/settings/store-banner',
    group: 'Settings',
    icon: Megaphone,
    matches: (pathname) => matchesAdminPath(pathname, '/admin/settings/store-banner'),
  },
] as const;

export const ADMIN_NAV_GROUP_ORDER = ['Catalog', 'Sales', 'Content', 'Settings'] as const;

export const ADMIN_SIDEBAR_WIDTH = 280;

export function getAdminActiveNavItem(pathname: string) {
  return ADMIN_NAV_ITEMS.find((item) => item.matches(pathname));
}

export function getAdminNavGroups() {
  return ADMIN_NAV_GROUP_ORDER.map((group) => ({
    label: group,
    items: ADMIN_NAV_ITEMS.filter((item) => item.group === group),
  }));
}

export function getAdminHeaderContext(pathname: string) {
  if (pathname === '/admin/login') {
    return {
      title: 'Admin access',
    };
  }

  const activeItem = getAdminActiveNavItem(pathname);

  if (!activeItem) {
    return {
      title: 'PopBox Studio Admin',
    };
  }

  return {
    title: activeItem.label,
  };
}

export function isAdminProductsPath(pathname: string) {
  return matchesAdminPath(pathname, '/admin/products');
}

export function isAdminNavItemActive(item: IAdminNavItem, pathname: string) {
  return item.matches(pathname);
}

export const ADMIN_STORE_LINK = '/';

export const ADMIN_BRAND = {
  mark: 'P',
  name: 'PopBox Studio',
  product: 'Admin',
  shortName: 'PopBox',
} as const;
