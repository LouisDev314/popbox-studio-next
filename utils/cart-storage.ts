import {
  type PersistStorage,
  type StorageValue,
} from 'zustand/middleware';
import { z } from 'zod';
import {
  type CartIssueCode,
  type ICartHydrationResult,
  type ICartItem,
  type ICartInvalidItem,
  type ICartMigrationNotice,
  type ICartProduct,
} from '@/interfaces/cart';
import { getCartItemKey } from '@/utils/cart';

const CART_STORAGE_VERSION = 3;

const cartCollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

const cartImageSchema = z.object({
  id: z.string().min(1),
  storageKey: z.string().min(1),
  altText: z.string().nullable(),
  sortOrder: z.number().int(),
  url: z.string().trim().min(1),
});

const cartInventorySchema = z.object({
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
});

const rawCartProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().nullable(),
  productType: z.enum(['standard', 'kuji']),
  status: z.enum(['draft', 'active', 'archived']),
  priceCents: z.number().int().nonnegative(),
  minPriceCents: z.number().int().nonnegative().optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  hasPriceRange: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
  defaultVariantId: z.string().uuid().nullable().optional(),
  hasVariantChoices: z.boolean().optional(),
  currency: z.string().trim().min(1),
  collections: z.array(cartCollectionSchema).catch([]),
  images: z.array(cartImageSchema),
  inventory: cartInventorySchema.nullable(),
  ticketSummary: z.object({
    remainingTickets: z.number().int().nonnegative(),
    totalTickets: z.number().int().nonnegative(),
  }).optional(),
}).passthrough();

const cartProductSchema = rawCartProductSchema.transform((product): ICartProduct => ({
  ...product,
  minPriceCents: product.minPriceCents ?? product.priceCents,
  maxPriceCents: product.maxPriceCents ?? product.priceCents,
  hasPriceRange: product.hasPriceRange ?? false,
  isSoldOut: product.isSoldOut ?? false,
  defaultVariantId: product.defaultVariantId ?? null,
  hasVariantChoices: product.hasVariantChoices ?? false,
}));

const cartVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  priceCents: z.number().int().nonnegative(),
});

const cartItemSchema = z.object({
  id: z.string().trim().min(1),
  product: cartProductSchema,
  variant: cartVariantSchema.nullable(),
  quantity: z.number().int().positive().max(20),
}).superRefine((item, context) => {
  if (item.product.productType === 'standard' && !item.variant) {
    context.addIssue({
      code: 'custom',
      message: 'Standard cart items require a product variant.',
      path: ['variant'],
    });
  }

  if (item.product.productType === 'kuji' && item.variant) {
    context.addIssue({
      code: 'custom',
      message: 'Kuji cart items cannot include a product variant.',
      path: ['variant'],
    });
  }
});

const invalidCartItemSchema = z.object({
  id: z.string().trim().min(1),
  issueCode: z.enum([
    'invalid_product_id',
    'missing_product_data',
    'invalid_quantity',
    'invalid_cart_item',
  ] as const),
  issueMessage: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  product: z.object({
    collectionName: z.string().nullable(),
    imageUrl: z.string().nullable(),
    name: z.string().trim().min(1),
    priceCents: z.number().int().nonnegative().nullable(),
    rawProductId: z.string().nullable(),
    slug: z.string().nullable(),
  }),
});

const migrationNoticeSchema = z.object({
  code: z.literal('legacy_standard_variants_removed'),
  removedCount: z.number().int().positive(),
});

export type CartPersistedState = {
  invalidItems: ICartInvalidItem[];
  items: ICartItem[];
  migrationNotice: ICartMigrationNotice | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getPositiveQuantity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : 1;
}

export function getCartIssueMessage(issueCode: CartIssueCode): string {
  switch (issueCode) {
    case 'invalid_product_id':
      return 'This cart item uses an outdated product reference and must be removed before checkout.';
    case 'invalid_quantity':
      return 'This cart item has an invalid quantity and must be removed before checkout.';
    case 'missing_product_data':
      return 'This cart item is missing required product data and must be removed before checkout.';
    default:
      return 'This cart item is corrupted and must be removed before checkout.';
  }
}

function inferCartIssueCode(error: z.ZodError): CartIssueCode {
  if (error.issues.some((issue) => (
    issue.path.join('.') === 'product.id' || issue.path.join('.') === 'id'
  ))) {
    return 'invalid_product_id';
  }

  if (error.issues.some((issue) => issue.path.join('.') === 'quantity')) {
    return 'invalid_quantity';
  }

  if (error.issues.some((issue) => issue.path[0] === 'product')) {
    return 'missing_product_data';
  }

  return 'invalid_cart_item';
}

function buildInvalidCartItem(
  value: unknown,
  fallbackId: string,
  issueCode: CartIssueCode,
): ICartInvalidItem {
  const item = isObject(value) ? value : {};
  const product = isObject(item.product) ? item.product : {};
  const images = Array.isArray(product.images) ? product.images : [];
  const firstImage = isObject(images[0]) ? images[0] : {};
  const collections = Array.isArray(product.collections) ? product.collections : [];
  const firstCollection = isObject(collections[0]) ? collections[0] : {};

  return {
    id: getStringOrNull(item.id) ?? fallbackId,
    issueCode,
    issueMessage: getCartIssueMessage(issueCode),
    quantity: getPositiveQuantity(item.quantity),
    product: {
      collectionName: getStringOrNull(firstCollection.name),
      imageUrl: getStringOrNull(firstImage.url),
      name: getStringOrNull(product.name) ?? 'Unavailable product',
      priceCents:
        typeof product.priceCents === 'number' && Number.isFinite(product.priceCents)
          ? Math.max(0, Math.floor(product.priceCents))
          : null,
      rawProductId: getStringOrNull(product.id),
      slug: getStringOrNull(product.slug),
    },
  };
}

function parsePersistedInvalidItems(value: unknown): ICartInvalidItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const parsedEntry = invalidCartItemSchema.safeParse(entry);

    return parsedEntry.success
      ? parsedEntry.data
      : buildInvalidCartItem(entry, `invalid-cart-item-${index + 1}`, 'invalid_cart_item');
  });
}

export function validateCartProduct(product: unknown) {
  return cartProductSchema.safeParse(product);
}

function mergeCartItems(items: ICartItem[]): ICartItem[] {
  const byKey = new Map<string, ICartItem>();

  for (const item of items) {
    const key = getCartItemKey(item);
    const existing = byKey.get(key);

    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + item.quantity);
      existing.product = item.product;
      existing.variant = item.variant;
    } else {
      byKey.set(key, { ...item });
    }
  }

  return [...byKey.values()];
}

export function hydrateCartItems(
  value: unknown,
  version = CART_STORAGE_VERSION,
): ICartHydrationResult {
  if (!Array.isArray(value)) {
    return {
      items: [],
      invalidItems: [],
      migrationNotice: null,
    };
  }

  if (version < CART_STORAGE_VERSION) {
    let removedStandardCount = 0;
    const retainedKujiItems: ICartItem[] = [];
    const invalidItems: ICartInvalidItem[] = [];

    value.forEach((entry, index) => {
      const rawEntry = isObject(entry) ? entry : {};
      const parsedProduct = cartProductSchema.safeParse(rawEntry.product);

      if (!parsedProduct.success) {
        invalidItems.push(buildInvalidCartItem(
          entry,
          `invalid-cart-item-${index + 1}`,
          inferCartIssueCode(parsedProduct.error),
        ));
        return;
      }

      if (parsedProduct.data.productType === 'standard') {
        removedStandardCount += 1;
        return;
      }

      const parsedEntry = cartItemSchema.safeParse({
        ...rawEntry,
        product: parsedProduct.data,
        variant: null,
      });

      if (parsedEntry.success) {
        retainedKujiItems.push(parsedEntry.data);
      } else {
        invalidItems.push(buildInvalidCartItem(
          entry,
          `invalid-cart-item-${index + 1}`,
          inferCartIssueCode(parsedEntry.error),
        ));
      }
    });

    return {
      items: mergeCartItems(retainedKujiItems),
      invalidItems,
      migrationNotice: removedStandardCount > 0
        ? {
          code: 'legacy_standard_variants_removed',
          removedCount: removedStandardCount,
        }
        : null,
    };
  }

  const result = value.reduce<ICartHydrationResult>((accumulator, entry, index) => {
    const parsedEntry = cartItemSchema.safeParse(entry);

    if (parsedEntry.success) {
      accumulator.items.push(parsedEntry.data);
    } else {
      accumulator.invalidItems.push(
        buildInvalidCartItem(entry, `invalid-cart-item-${index + 1}`, inferCartIssueCode(parsedEntry.error)),
      );
    }

    return accumulator;
  }, {
    items: [],
    invalidItems: [],
    migrationNotice: null,
  });

  return {
    ...result,
    items: mergeCartItems(result.items),
  };
}

export function normalizeCartPersistedState(
  value: unknown,
  version = CART_STORAGE_VERSION,
): CartPersistedState {
  const state = isObject(value) ? value : {};
  const hydratedItems = hydrateCartItems(state.items, version);
  const persistedInvalidItems = parsePersistedInvalidItems(state.invalidItems);
  const parsedNotice = migrationNoticeSchema.safeParse(state.migrationNotice);

  return {
    items: hydratedItems.items,
    invalidItems: [...persistedInvalidItems, ...hydratedItems.invalidItems],
    migrationNotice: hydratedItems.migrationNotice
      ?? (parsedNotice.success ? parsedNotice.data : null),
  };
}

export function parseCartStorageValue(
  storedValue: string,
): StorageValue<CartPersistedState> | null {
  const parsedValue: unknown = JSON.parse(storedValue);

  if (!isObject(parsedValue)) {
    return null;
  }

  const state = isObject(parsedValue.state) ? parsedValue.state : null;
  const version = parsedValue.version;

  if (!state || (version !== undefined && typeof version !== 'number')) {
    return null;
  }

  const storedVersion = typeof version === 'number' ? version : 0;

  return {
    state: normalizeCartPersistedState(state, storedVersion),
    version: storedVersion,
  };
}

export function createCartStorage<
  State extends {
    items: unknown;
    invalidItems: unknown;
    migrationNotice: unknown;
  },
>(_storageKey: string): PersistStorage<State> {
  return {
    getItem: (name) => {
      if (typeof window === 'undefined') {
        return null;
      }

      const storedValue = window.localStorage.getItem(name);
      if (!storedValue) {
        return null;
      }

      try {
        return parseCartStorageValue(storedValue) as StorageValue<State> | null;
      } catch {
        window.localStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, JSON.stringify(value));
      }
    },
    removeItem: (name) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
    },
  };
}

export const CART_STORAGE_KEY = 'popbox-cart-storage';
export const CART_STORAGE_VERSION_NUMBER = CART_STORAGE_VERSION;
