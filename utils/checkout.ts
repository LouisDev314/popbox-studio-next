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

export function isFinalizedCheckoutOrder(order: IOrderDetail): boolean {
  return FINALIZED_CHECKOUT_ORDER_STATUSES.has(order.status);
}

export function getPurchasedProductIdsFromOrder(order: IOrderDetail): string[] {
  return [...new Set(order.items.map((item) => item.productId))];
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
