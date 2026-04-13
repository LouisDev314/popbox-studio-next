/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductTileDense } from '@/components/product/product-tile-dense';
import { createProductCard } from '../fixtures';
import { renderWithProviders } from '../test-utils';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} />,
}));

describe('ProductTileDense', () => {
  it('renders the kuji ticket summary label from ticketSummary on storefront cards', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'kuji-product',
          name: 'Kuji Product',
          slug: 'kuji-product',
          productType: 'kuji',
          ticketSummary: {
            remainingTickets: 23,
            totalTickets: 80,
          },
        })}
      />,
    );

    expect(screen.getByText('23/80 tickets')).toBeInTheDocument();
  });

  it('does not render a ticket summary for non-kuji cards', () => {
    renderWithProviders(
      <ProductTileDense
        product={createProductCard({
          id: 'standard-product',
          name: 'Standard Product',
          slug: 'standard-product',
        })}
      />,
    );

    expect(screen.queryByText(/tickets$/)).not.toBeInTheDocument();
  });
});
