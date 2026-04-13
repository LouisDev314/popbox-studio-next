import {
  type ICartInvalidItem,
  type ICartItem,
  type ICartProduct,
} from '@/interfaces/cart';
import { type IProductCard, type IKujiTicketSummary } from '@/interfaces/product';

export const VALID_PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

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
    currency: 'CAD',
    collection: {
      id: 'collection-1',
      name: 'Featured',
      slug: 'featured',
    },
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

export function createProductCard(
  overrides: Partial<IProductCard> & { ticketSummary?: IKujiTicketSummary } = {},
): IProductCard {
  return {
    id: overrides.id ?? VALID_PRODUCT_ID,
    name: overrides.name ?? 'Ichiban Figure',
    slug: overrides.slug ?? 'ichiban-figure',
    description: overrides.description ?? 'Premium collectible figure',
    productType: overrides.productType ?? 'standard',
    status: overrides.status ?? 'active',
    priceCents: overrides.priceCents ?? 4999,
    currency: overrides.currency ?? 'CAD',
    collection: overrides.collection ?? {
      id: 'collection-1',
      name: 'Featured',
      slug: 'featured',
    },
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
  } = {},
): ICartItem {
  return {
    id: overrides.id ?? 'cart-item-1',
    product: createCartProduct(overrides.product ?? {}),
    quantity: overrides.quantity ?? 1,
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
