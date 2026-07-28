import {
  type ICartInvalidItem,
  type ICartItem,
  type ICartProduct,
  type ICartVariantSnapshot,
} from '@/interfaces/cart';
import { type IProductCard, type IKujiTicketSummary } from '@/interfaces/product';
import { type IWishlistItem } from '@/interfaces/wishlist';

export const VALID_PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
export const VALID_VARIANT_ID = '33333333-3333-4333-8333-333333333333';

export function createCartProduct(
  overrides: Partial<ICartProduct> = {},
): ICartProduct {
  return {
    id: VALID_PRODUCT_ID,
    name: 'Ichiban Figure',
    slug: 'ichiban-figure',
    description: 'Premium collectible figure',
    productType: 'standard',
    status: 'active',
    priceCents: 4999,
    minPriceCents: 4999,
    maxPriceCents: 4999,
    hasPriceRange: false,
    isSoldOut: false,
    defaultVariantId: VALID_VARIANT_ID,
    hasVariantChoices: false,
    currency: 'CAD',
    collections: [
      {
        id: 'collection-1',
        name: 'Featured',
        slug: 'featured',
      },
    ],
    images: [
      {
        id: 'image-1',
        storageKey: 'products/figure-1.jpg',
        altText: null,
        sortOrder: 0,
        url: 'https://example.com/products/figure-1.jpg',
      },
    ],
    inventory: {
      onHand: 10,
      reserved: 0,
      available: 10,
      lowStockThreshold: 2,
    },
    ...overrides,
  };
}

// Test fixtures intentionally expose every backend card field as an override.
// eslint-disable-next-line complexity
export function createProductCard(
  overrides: Partial<IProductCard> & { ticketSummary?: IKujiTicketSummary } = {},
): IProductCard {
  return {
    id: overrides.id ?? VALID_PRODUCT_ID,
    name: overrides.name ?? 'Ichiban Figure',
    slug: overrides.slug ?? 'ichiban-figure',
    description: overrides.description ?? 'Premium collectible figure',
    updatedAt: overrides.updatedAt ?? '2026-04-02T10:00:00.000Z',
    productType: overrides.productType ?? 'standard',
    status: overrides.status ?? 'active',
    priceCents: overrides.priceCents ?? 4999,
    minPriceCents: overrides.minPriceCents ?? overrides.priceCents ?? 4999,
    maxPriceCents: overrides.maxPriceCents ?? overrides.priceCents ?? 4999,
    hasPriceRange: overrides.hasPriceRange ?? false,
    isSoldOut: overrides.isSoldOut ?? false,
    defaultVariantId: overrides.defaultVariantId
      ?? (overrides.productType === 'kuji' ? null : VALID_VARIANT_ID),
    hasVariantChoices: overrides.hasVariantChoices ?? false,
    currency: overrides.currency ?? 'CAD',
    collections: overrides.collections ?? [
      {
        id: 'collection-1',
        name: 'Featured',
        slug: 'featured',
      },
    ],
    images: overrides.images ?? [
      {
        id: 'image-1',
        storageKey: 'products/figure-1.jpg',
        altText: null,
        sortOrder: 0,
        url: 'https://example.com/products/figure-1.jpg',
      },
    ],
    inventory: overrides.inventory ?? {
      onHand: 10,
      reserved: 0,
      available: 10,
      lowStockThreshold: 2,
    },
    ticketSummary: overrides.ticketSummary,
  };
}

export function createCartItem(
  overrides: {
    id?: string;
    product?: Partial<ICartProduct>;
    quantity?: number;
    variant?: ICartVariantSnapshot | null;
  } = {},
): ICartItem {
  const product = createCartProduct(overrides.product ?? {});

  return {
    id: overrides.id ?? 'cart-item-1',
    product,
    variant: overrides.variant === undefined
      ? product.productType === 'standard'
        ? {
          id: product.defaultVariantId ?? VALID_VARIANT_ID,
          name: 'Default',
          priceCents: product.priceCents,
        }
        : null
      : overrides.variant,
    quantity: overrides.quantity ?? 1,
  };
}

export function createWishlistItem(
  overrides: Partial<IWishlistItem> = {},
): IWishlistItem {
  return {
    id: overrides.id ?? VALID_PRODUCT_ID,
    name: overrides.name ?? 'Ichiban Figure',
    slug: overrides.slug ?? 'ichiban-figure',
    imageUrl: overrides.imageUrl ?? 'https://example.com/products/figure-1.jpg',
    priceCents: overrides.priceCents ?? 4999,
    currency: overrides.currency ?? 'CAD',
    productType: overrides.productType ?? 'standard',
  };
}

export function createInvalidCartItem(
  overrides: Partial<ICartInvalidItem> = {},
): ICartInvalidItem {
  return {
    id: 'invalid-cart-item-1',
    issueCode: 'invalid_product_id',
    issueMessage: 'This cart item uses an outdated product reference and must be removed before checkout.',
    product: {
      collectionName: 'Featured',
      imageUrl: 'https://example.com/products/legacy-figure.jpg',
      name: 'Legacy Figure',
      priceCents: 4999,
      rawProductId: 'legacy-figure',
      slug: 'legacy-figure',
    },
    quantity: 1,
    ...overrides,
  };
}

export function createCheckoutSessionResponse(checkoutUrl = 'https://checkout.stripe.com/pay/cs_test_123') {
  return {
    code: 200,
    data: {
      checkoutUrl,
      orderId: '22222222-2222-4222-8222-222222222222',
      publicId: 'pbs-123456',
      sessionId: 'cs_test_123',
    },
    message: 'Checkout session created.',
    status: 'success',
    success: true,
  };
}
