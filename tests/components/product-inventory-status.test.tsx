import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductInventoryStatus } from '@/components/product/product-inventory-status';
import { renderWithProviders } from '../test-utils';

describe('ProductInventoryStatus', () => {
  it('renders the kuji ticket summary from kujiPrizes on the PDP fallback path', () => {
    renderWithProviders(
      <ProductInventoryStatus
        product={{
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
        }}
        variant="detail"
      />,
    );

    expect(screen.getByText('Remaining: 23/80 tickets')).toBeInTheDocument();
  });
});
