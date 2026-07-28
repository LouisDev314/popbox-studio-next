// Handwritten frontend DTOs kept in sync with the backend OpenAPI contract.

export interface ICollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type IProductCollection = Pick<ICollection, 'id' | 'name' | 'slug'>;

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

export interface IAdminProductListPrimaryImage {
  storageKey: string | null;
  altText: string | null;
  url: string | null;
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
  prizeTier: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
}

export interface IKujiTicketSummary {
  remainingTickets: number;
  totalTickets: number;
}

export interface IStorefrontProductVariant {
  id: string;
  name: string;
  priceCents: number;
  sortOrder: number;
  isAvailable: boolean;
}

export interface IProductPriceRange {
  minCents: number;
  maxCents: number;
  isRange: boolean;
}

export interface IProductCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  productType: 'standard' | 'kuji';
  status: 'draft' | 'active' | 'archived';
  priceCents: number;
  minPriceCents: number;
  maxPriceCents: number;
  hasPriceRange: boolean;
  isSoldOut: boolean;
  defaultVariantId: string | null;
  hasVariantChoices: boolean;
  currency: string;
  collections: IProductCollection[];
  images: IProductImage[];
  inventory: IProductInventory | null;
  ticketSummary?: IKujiTicketSummary;
}

export interface IProduct extends IProductCard {
  sku: string | null;
  tags: ITag[];
  kujiPrizes: IKujiPrize[];
  variants?: IStorefrontProductVariant[];
  priceRange?: IProductPriceRange;
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

export interface IAdminProductListItem {
  id: string;
  name: string;
  slug: string;
  productType: productType;
  status: productStatus;
  priceCents: number;
  currency: string;
  sku: string | null;
  collections: IProductCollection[];
  inventory: IProductInventory | null;
  tags: ITag[];
  primaryImage: IAdminProductListPrimaryImage | null;
  updatedAt: string;
}

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
  collections: IProductCollection[];
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
  collections: IProductCollection[];
  inventory: IProductInventory | null;
  tags: ITag[];
  images: IAdminProductImage[];
  kujiPrizes: IKujiPrize[];
  variants?: IAdminProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface IAdminProductEditor extends Omit<IAdminProductDetail, 'images'> {
  collectionIds: string[];
  tagIds: string[];
  images: IAdminProductImage[];
}

export interface IAdminProductListResponse {
  items: IAdminProductListItem[];
  nextCursor: string | null;
  totalCount: number;
}

export interface IAdminFeaturedOrderItem {
  id: string;
  name: string;
  productType: productType;
  status: productStatus;
  sortOrder: number;
  collections: IProductCollection[];
  primaryImage: IAdminProductListPrimaryImage | null;
}

export interface IAdminFeaturedOrderResponse {
  items: IAdminFeaturedOrderItem[];
  membershipSignature: string;
}

export interface IAdminFeaturedOrderUpdate {
  membershipSignature: string;
  productIds: string[];
}

export interface IAdminProductStatusUpdate {
  status: productStatus;
}

export interface IAdminProductCreate {
  collectionIds: string[];
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
  collectionIds?: string[];
  tagIds?: string[];
  lowStockThreshold?: number;
}

export interface IAdminProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  priceCents: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  inventory: IProductInventory;
}

export interface IAdminProductVariantCreate {
  name: string;
  sku?: string | null;
  priceCents: number;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  inventory?: Partial<Pick<IProductInventory, 'onHand' | 'lowStockThreshold'>>;
}

export type IAdminProductVariantUpdate = Partial<
  Pick<
    IAdminProductVariant,
    'name' | 'sku' | 'priceCents' | 'isActive' | 'isDefault' | 'sortOrder'
  >
>;

export type IAdminProductVariantInventoryUpdate = Partial<
  Pick<IProductInventory, 'onHand' | 'lowStockThreshold'>
>;

export interface IAdminProductVariantInventoryResponse {
  productVariantId: string;
  onHand: number;
  reserved: number;
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
  prizeTier: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
}

export type IAdminKujiPrizeUpdateRequest = Partial<IAdminKujiPrizeCreateRequest>;

export type IAdminProductImageUploadResponse = IAdminProductImagePatch | IAdminProductImagePatch[];
