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

export interface IAdminProductImage {
  id: string;
  storageKey: string | null;
  altText: string | null;
  sortOrder: number;
  url: string | null;
}

export interface IAdminProductImagePatch {
  id: string;
  storageKey?: string | null;
  altText?: string | null;
  sortOrder?: number | null;
  url?: string | null;
}

export type IAdminProductImageUpload = IAdminProductImagePatch;

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

export interface IProductRecommendationsResponse {
  items: IProductCard[];
  meta: {
    count: number;
    limit: number;
  };
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

export type productSort = 'trending' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

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
  // Admin list/create/update responses are not a reliable full detail shape yet.
  collection?: Pick<ICollection, 'id' | 'name'> | null;
  tags?: ITag[];
  images?: IAdminProductImage[];
  inventory?: IProductInventory | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productType: productType;
  status: productStatus;
  priceCents: number;
  currency: string;
  sku: string | null;
  collection: Pick<ICollection, 'id' | 'name' | 'slug'> | null;
  inventory: IProductInventory | null;
  tags: ITag[];
  images: IAdminProductImage[];
  kujiPrizes: IKujiPrize[];
  createdAt: string;
  updatedAt: string;
}

export interface IAdminProductEditor extends Omit<IAdminProductDetail, 'images'> {
  collectionId: string | null;
  tagIds: string[];
  images: IAdminProductImage[];
}

export interface IAdminProductListResponse {
  items: IAdminProduct[];
}

export interface IAdminProductStatusUpdate {
  status: productStatus;
}

export interface IAdminProductCreate {
  collectionId: string | null;
  name: string;
  description: string | null;
  productType: productType;
  status: productStatus;
  priceCents: number;
  currency: string;
  sku: string | null;
  tagIds: string[];
  lowStockThreshold: number;
  onHand: number;
}

export interface IAdminProductUpdate {
  name?: string;
  description?: string | null;
  productType?: productType;
  status?: productStatus;
  priceCents?: number;
  currency?: string;
  sku?: string | null;
  collectionId?: string | null;
  tagIds?: string[];
  lowStockThreshold?: number;
}

export interface IAdminProductInventoryUpdate {
  onHand: number;
  lowStockThreshold: number;
}

export interface IAdminCollectionCreateRequest {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type IAdminCollectionUpdateRequest = Partial<IAdminCollectionCreateRequest>;

export interface IAdminTagCreateRequest {
  name: string;
  slug: string;
  tagType: string;
}

export type IAdminTagUpdateRequest = Partial<IAdminTagCreateRequest>;

export interface IAdminKujiPrizeCreateRequest {
  prizeCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
}

export type IAdminKujiPrizeUpdateRequest = Partial<IAdminKujiPrizeCreateRequest>;

export type IAdminProductImageUploadResponse = IAdminProductImageUpload | IAdminProductImageUpload[];
