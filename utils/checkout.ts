import { IOrderDetail, IOrderStatus } from '@/interfaces/order';

const FINALIZED_CHECKOUT_ORDER_STATUSES = new Set<IOrderStatus>([
  'paid',
  'packed',
  'shipped',
  'paid_needs_attention',
]);

export function isFinalizedCheckoutOrder(order: IOrderDetail): boolean {
  return FINALIZED_CHECKOUT_ORDER_STATUSES.has(order.status);
}

export function getPurchasedProductIdsFromOrder(order: IOrderDetail): string[] {
  return [...new Set(order.items.map((item) => item.productId))];
}
