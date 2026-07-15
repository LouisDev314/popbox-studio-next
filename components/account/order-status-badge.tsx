import { Badge } from '@/components/ui/badge';
import type { IOrderStatus } from '@/interfaces/order';

export const ORDER_STATUS_LABELS: Record<IOrderStatus, string> = {
  pending_payment: 'Payment pending',
  paid: 'Paid',
  packed: 'Packed',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  paid_needs_attention: 'Payment review',
  expired: 'Expired',
};

export function OrderStatusBadge({ status }: { status: IOrderStatus }) {
  return <Badge variant={status === 'cancelled' || status === 'refunded' || status === 'expired' ? 'destructive' : 'secondary'}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function getAccountOrderItemCount(products: Array<{ quantity: number }>) {
  return products.reduce((total, product) => total + product.quantity, 0);
}
