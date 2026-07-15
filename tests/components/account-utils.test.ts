import { describe, expect, it } from 'vitest';
import { getAccountOrderItemCount, ORDER_STATUS_LABELS } from '@/components/account/order-status-badge';
import { normalizeAccountTicket, normalizeRawOrderTicket } from '@/components/kuji/ticket-adapter';
import type { IAccountOrderTicket } from '@/interfaces/account';
import type { IOrderTicket } from '@/interfaces/order';

describe('account order presentation', () => {
  it('uses customer-safe status labels and sums quantities', () => {
    expect(ORDER_STATUS_LABELS.paid_needs_attention).toBe('Payment review');
    expect(getAccountOrderItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });
});

describe('ticket normalization', () => {
  const base = {
    id: 'ticket-1', ticketNumber: 'A-01', createdAt: '2026-01-01T00:00:00Z', revealedAt: null, voidedAt: null, voidReason: null,
  };

  it('keeps an unrevealed account prize masked', () => {
    const ticket: IAccountOrderTicket = {
      ...base,
      product: { productId: 'product-1', name: 'Kuji', slug: 'kuji', imageUrl: null, imageAltText: null },
      prize: { prizeCode: 'A', name: 'Hidden', description: null, imageUrl: null, prizeTier: 'A' },
    };
    expect(normalizeAccountTicket(ticket).prize).toBeNull();
  });

  it('drops internal prize ids from raw reveal responses', () => {
    const ticket: IOrderTicket = {
      ...base,
      revealedAt: '2026-01-01T00:01:00Z',
      kujiProduct: { id: 'product-1', name: 'Kuji', slug: 'kuji', imageUrl: null, imageAltText: null },
      prize: { id: 'internal-prize-id', prizeCode: 'A', name: 'Prize', description: null, imageUrl: null, prizeTier: 'A' },
    };
    expect(normalizeRawOrderTicket(ticket).prize).toEqual({ prizeCode: 'A', name: 'Prize', description: null, imageUrl: null, prizeTier: 'A' });
    expect(normalizeRawOrderTicket(ticket).prize).not.toHaveProperty('id');
  });
});
