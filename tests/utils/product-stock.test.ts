import { describe, expect, it } from 'vitest';
import {
  formatKujiTicketSummaryLabel,
  getKujiTicketSummary,
  getProductInventoryStatusLabel,
  getProductKujiTicketSummary,
} from '@/utils/product-stock';

describe('product-stock', () => {
  it('excludes the LO prize and clamps invalid values when deriving kuji ticket totals', () => {
    const summary = getKujiTicketSummary([
      {
        prizeTier: 'A',
        initialQuantity: 50,
        remainingQuantity: 14,
      },
      {
        prizeTier: 'B',
        initialQuantity: -5,
        remainingQuantity: -2,
      },
      {
        prizeTier: 'C',
        initialQuantity: 30,
        remainingQuantity: 12,
      },
      {
        prizeTier: 'LO',
        initialQuantity: 1,
        remainingQuantity: 1,
      },
    ]);

    expect(summary).toEqual({
      remainingTickets: 26,
      totalTickets: 80,
    });
    expect(formatKujiTicketSummaryLabel(summary)).toBe('Remaining: 26/80 tickets');
  });

  it('prefers backend ticketSummary over kujiPrizes when both are present', () => {
    const summary = getProductKujiTicketSummary({
      inventory: {
        onHand: 20,
        reserved: 0,
        available: 20,
        lowStockThreshold: 2,
      },
      kujiPrizes: [
        {
          id: 'prize-a',
          prizeCode: 'A',
          prizeTier: 'A',
          name: 'Prize A',
          description: null,
          imageUrl: null,
          initialQuantity: 50,
          remainingQuantity: 15,
          sortOrder: 0,
        },
      ],
      productType: 'kuji',
      ticketSummary: {
        remainingTickets: 23,
        totalTickets: 80,
      },
    });

    expect(summary).toEqual({
      remainingTickets: 23,
      totalTickets: 80,
    });
  });

  it('falls back to kujiPrizes for the kuji storefront label when ticketSummary is absent', () => {
    expect(getProductInventoryStatusLabel({
      inventory: {
        onHand: 23,
        reserved: 0,
        available: 23,
        lowStockThreshold: 2,
      },
      kujiPrizes: [
        {
          id: 'prize-a',
          prizeCode: 'A',
          prizeTier: 'A',
          name: 'Prize A',
          description: null,
          imageUrl: null,
          initialQuantity: 50,
          remainingQuantity: 11,
          sortOrder: 0,
        },
        {
          id: 'prize-b',
          prizeCode: 'B',
          prizeTier: 'B',
          name: 'Prize B',
          description: null,
          imageUrl: null,
          initialQuantity: 30,
          remainingQuantity: 12,
          sortOrder: 1,
        },
        {
          id: 'prize-lo',
          prizeCode: 'L1',
          prizeTier: 'LO',
          name: 'Last One',
          description: null,
          imageUrl: null,
          initialQuantity: 1,
          remainingQuantity: 1,
          sortOrder: 2,
        },
      ],
      productType: 'kuji',
    })).toBe('Remaining: 23/80 tickets');
  });
});
