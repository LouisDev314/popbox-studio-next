import { describe, expect, it } from 'vitest';
import { getAccountOrderItemCount, ORDER_STATUS_LABELS } from '@/components/account/order-status-badge';

describe('account order presentation', () => {
  it('uses customer-safe status labels and sums quantities', () => {
    expect(ORDER_STATUS_LABELS.paid_needs_attention).toBe('Payment review');
    expect(getAccountOrderItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });
});
