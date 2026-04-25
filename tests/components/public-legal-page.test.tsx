import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicLegalPage } from '@/components/storefront/legal/public-legal-page';
import type { IPublicLegalDocument } from '@/interfaces/legal';

function createLegalDocument(overrides: Partial<IPublicLegalDocument> = {}): IPublicLegalDocument {
  return {
    id: 'legal-1',
    type: 'shipping_returns',
    title: 'Shipping & Returns',
    content: 'Kuji items are random draw and final sale.\n\nReturns must be approved before sending items back.',
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('PublicLegalPage', () => {
  it('renders the shipping rate table before existing shipping policy content', () => {
    render(<PublicLegalPage doc={createLegalDocument()} />);

    expect(screen.getByRole('heading', { name: 'Shipping Rates Across Canada' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Shipping Method' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Standard Shipping' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$15.99 CAD' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'FREE' })).toBeInTheDocument();
    expect(screen.getAllByText(/before shipping and tax/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/single order subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/Kuji items are random draw and final sale/i)).toBeInTheDocument();
  });

  it('renders backend shipping settings when provided', () => {
    render(
      <PublicLegalPage
        doc={createLegalDocument()}
        shippingSettings={{
          flatShippingCents: 1299,
          freeShippingThresholdCents: 9900,
          currency: 'CAD',
        }}
      />,
    );

    expect(screen.getByRole('cell', { name: '$12.99 CAD' })).toBeInTheDocument();
    expect(screen.getAllByText(/99.00 CAD/i).length).toBeGreaterThan(0);
  });

  it('does not render the shipping rate table on other legal pages', () => {
    render(<PublicLegalPage doc={createLegalDocument({ type: 'terms', title: 'Terms of Service' })} />);

    expect(screen.queryByRole('heading', { name: 'Shipping Rates Across Canada' })).not.toBeInTheDocument();
  });
});
