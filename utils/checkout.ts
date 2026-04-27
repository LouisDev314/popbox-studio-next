import { z } from 'zod';
import {
  type ICartItem,
  type ICartInvalidItem,
} from '@/interfaces/cart';
import {
  type CheckoutValidationResult,
  type ICheckoutRequest,
} from '@/interfaces/checkout';
import { IOrderDetail, IOrderStatus } from '@/interfaces/order';

export interface IPurchasedLine {
  productId: string;
  quantity: number;
}

const FINALIZED_CHECKOUT_ORDER_STATUSES = new Set<IOrderStatus>([
  'paid',
  'packed',
  'shipped',
  'paid_needs_attention',
]);

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const checkoutRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
});

const STRIPE_CHECKOUT_HOSTNAME = 'checkout.stripe.com';
const STRIPE_CHECKOUT_PATH_PREFIXES = ['/c/pay/', '/pay/'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getStringProperty(value: Record<string, unknown>, key: string): string | null {
  const property = value[key];

  return typeof property === 'string' && property.trim() ? property.trim() : null;
}

function getOrderItemProductId(item: unknown): string | null {
  if (!isObject(item)) {
    return null;
  }

  const directProductId = getStringProperty(item, 'productId') ?? getStringProperty(item, 'product_id');

  if (directProductId) {
    return directProductId;
  }

  const product = item.product;

  if (!isObject(product)) {
    return null;
  }

  return (
    getStringProperty(product, 'id')
    ?? getStringProperty(product, 'productId')
    ?? getStringProperty(product, 'product_id')
  );
}

function getOrderItemQuantity(item: unknown): number {
  if (!isObject(item) || typeof item.quantity !== 'number' || !Number.isFinite(item.quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(item.quantity));
}

export function isFinalizedCheckoutOrder(order: IOrderDetail): boolean {
  return FINALIZED_CHECKOUT_ORDER_STATUSES.has(order.status);
}

export function getPurchasedLinesFromOrder(order: IOrderDetail): IPurchasedLine[] {
  const purchasedQuantityByProductId = order.items.reduce((lines, item) => {
    const productId = getOrderItemProductId(item);
    const quantity = getOrderItemQuantity(item);

    if (!productId || quantity <= 0) {
      return lines;
    }

    lines.set(productId, (lines.get(productId) ?? 0) + quantity);

    return lines;
  }, new Map<string, number>());

  return Array.from(purchasedQuantityByProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function getPurchasedProductIdsFromOrder(order: IOrderDetail): string[] {
  return getPurchasedLinesFromOrder(order).map((line) => line.productId);
}

export function getInvalidCartItemsCheckoutMessage(invalidItems: ICartInvalidItem[]): string {
  if (invalidItems.length === 1) {
    return 'One cart item is no longer valid. Remove it before checking out.';
  }

  return 'Some cart items are no longer valid. Remove them before checking out.';
}

export function buildCheckoutRequest(items: ICartItem[]): CheckoutValidationResult {
  const payload: ICheckoutRequest = {
    items: items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    })),
  };

  const parsedPayload = checkoutRequestSchema.safeParse(payload);

  if (parsedPayload.success) {
    return {
      data: parsedPayload.data,
      success: true,
    };
  }

  return {
    issues: parsedPayload.error.issues.map((issue) => issue.message),
    message: 'Your cart contains invalid checkout data. Remove the item and try again.',
    success: false,
  };
}

export function getValidatedCheckoutUrl(checkoutUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    throw new Error('We couldn’t start checkout because the payment link was invalid. Please try again.');
  }

  const hasAllowedPath = STRIPE_CHECKOUT_PATH_PREFIXES.some((prefix) => parsedUrl.pathname.startsWith(prefix));

  if (
    parsedUrl.protocol !== 'https:'
    || parsedUrl.hostname !== STRIPE_CHECKOUT_HOSTNAME
    || !hasAllowedPath
  ) {
    throw new Error('We couldn’t start checkout because the payment link was invalid. Please try again.');
  }

  return parsedUrl.toString();
}

export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(getValidatedCheckoutUrl(checkoutUrl));
}
