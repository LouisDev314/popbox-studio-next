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

    expect(screen.getByRole('heading', { name: /Shipping rates across Canada/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Destination' })).toBeInTheDocument();
    expect(screen.getByText('Calgary')).toBeInTheDocument();
    expect(screen.getByText('Alberta outside Calgary')).toBeInTheDocument();
    expect(screen.getByText('Rest of Canada')).toBeInTheDocument();
    expect(screen.getAllByText('$15.99 CAD')).toHaveLength(3);
    expect(screen.getByText('$77.00 CAD+')).toBeInTheDocument();
    expect(screen.getByText('$88.00 CAD+')).toBeInTheDocument();
    expect(screen.getByText('$149.00 CAD+')).toBeInTheDocument();
    expect(screen.getByText(/merchandise subtotal before tax and shipping/i)).toBeInTheDocument();
    expect(screen.getAllByText(/shipping postal code/i)).toHaveLength(2);
    expect(screen.getByText(/Promotional discounts applied afterward/i)).toBeInTheDocument();
    expect(screen.getByText(/single order subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/Kuji items are random draw and final sale/i)).toBeInTheDocument();
  });

  it('renders backend shipping settings when provided', () => {
    render(
      <PublicLegalPage
        doc={createLegalDocument()}
        shippingSettings={{
          flatShippingCents: 1299,
          calgaryFreeShippingThresholdCents: 7500,
          albertaFreeShippingThresholdCents: 8500,
          freeShippingThresholdCents: 9900,
          currency: 'CAD',
        }}
      />,
    );

    expect(screen.getAllByText('$12.99 CAD')).toHaveLength(3);
    expect(screen.getByText('$75.00 CAD+')).toBeInTheDocument();
    expect(screen.getByText('$85.00 CAD+')).toBeInTheDocument();
    expect(screen.getByText('$99.00 CAD+')).toBeInTheDocument();
  });

  it('does not render the shipping rate table on other legal pages', () => {
    render(<PublicLegalPage doc={createLegalDocument({ type: 'terms', title: 'Terms of Service' })} />);

    expect(screen.queryByRole('heading', { name: /Shipping rates across Canada/i })).not.toBeInTheDocument();
  });
});
