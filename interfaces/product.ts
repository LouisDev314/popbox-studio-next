// This file is auto-generated based on the OpenAPI specification
// DO NOT EDIT MANUALLY unless you know what you are doing.

export interface ICollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ITag {
  id: string;
  name: string;
  slug: string;
  tagType: string;
}

export interface IProductImage {
  id: string;
  storageKey: string;
  altText: string | null;
  sortOrder: number;
  url: string;
}

export interface IProductInventory {
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}

export interface IKujiPrize {
  id: string;
  prizeCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
}

export interface IProductCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productType: 'standard' | 'kuji';
  status: 'draft' | 'active' | 'archived';
  priceCents: number;
  currency: string;
  collection: Pick<ICollection, 'id' | 'name' | 'slug'> | null;
  images: IProductImage[];
  inventory: IProductInventory | null;
}

export interface IProduct extends IProductCard {
  sku: string | null;
  tags: ITag[];
  kujiPrizes: IKujiPrize[];
  createdAt: string;
  updatedAt: string;
}

export interface IProductListPage {
  items: IProductCard[];
  nextCursor: string | null;
}

export interface IProductSuggestion {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  priceCents: number;
  currency: string;
}

export interface IProductSuggestionResponse {
  items: IProductSuggestion[];
}

export type productSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

export type productType = 'standard' | 'kuji';

export type productStatus = 'draft' | 'active' | 'archived';

// --- Admin-specific types ---

export interface IAdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productType: productType;
  status: productStatus;
  priceCents: number;
  currency: string;
  sku: string | null;
  collectionId: string | null;
  collection: Pick<ICollection, 'id' | 'name'> | null;
  tags: ITag[];
  images: IProductImage[];
  inventory: IProductInventory | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminProductListResponse {
  items: IAdminProduct[];
}

export interface IAdminProductStatusUpdate {
  status: productStatus;
}

export interface IAdminProductCreate {
  name: string;
  description: string | null;
  productType: productType;
  status: productStatus;
  priceCents: number;
  sku: string | null;
  collectionId: string | null;
  tagIds: string[];
  inventory: {
    onHand: number;
    lowStockThreshold: number;
  } | null;
}

export interface IAdminProductUpdate {
  name?: string;
  description?: string | null;
  status?: productStatus;
  priceCents?: number;
  sku?: string | null;
  collectionId?: string | null;
  tagIds?: string[];
}

export interface IAdminProductInventoryUpdate {
  onHand: number;
  lowStockThreshold: number;
}
