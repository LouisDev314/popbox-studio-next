import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartSummary } from '@/components/cart/cart-summary';
import { type ICartSummary } from '@/interfaces/cart';
import { type CheckoutQuoteData, type TaxBreakdown } from '@/interfaces/checkout';
import { renderWithProviders } from '../test-utils';

const summary: ICartSummary = {
  currency: 'CAD',
  subtotalCents: 4999,
  totalItems: 1,
};

const emptyTaxBreakdown: TaxBreakdown = {
  countryCode: 'CA',
  provinceCode: 'BC',
  taxableAmountCents: 6199,
  gstRatePpm: 0,
  pstRatePpm: 0,
  hstRatePpm: 0,
  qstRatePpm: 0,
  gstCents: 0,
  pstCents: 0,
  hstCents: 0,
  qstCents: 0,
  totalTaxCents: 0,
};

function createQuote(
  taxBreakdown: Partial<TaxBreakdown>,
  taxCents = 500,
  overrides: Partial<CheckoutQuoteData> = {},
): CheckoutQuoteData {
  return {
    subtotalCents: 4999,
    shippingCents: 1200,
    taxCents,
    totalCents: 4999 + 1200 + taxCents,
    taxBreakdown: {
      ...emptyTaxBreakdown,
      totalTaxCents: taxCents,
      ...taxBreakdown,
    },
    ...overrides,
  };
}

describe('CartSummary tax display', () => {
  it('shows a normal Tax row when there are no tax breakdown components', () => {
    renderWithProviders(<CartSummary summary={summary} quote={createQuote({})} />);

    const totals = screen.getByTestId('cart-summary-backend-totals');

    expect(within(totals).getByText('Tax')).toBeInTheDocument();
    expect(within(totals).getByText('$5.00')).toBeInTheDocument();
  });

  it('renders a single tax component inline without a duplicate breakdown row', () => {
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({
        gstCents: 500,
        gstRatePpm: 50000,
      })}
    />);

    const totals = screen.getByTestId('cart-summary-backend-totals');

    expect(within(totals).getByText('Tax (GST 5%)')).toBeInTheDocument();
    expect(within(totals).getByText('$5.00')).toBeInTheDocument();
    expect(within(totals).queryByText(/^GST 5%$/)).not.toBeInTheDocument();
  });

  it('renders a single tax component without the rate when rate is unavailable', () => {
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({
        gstCents: 500,
        gstRatePpm: 0,
      })}
    />);

    expect(screen.getByText('Tax (GST)')).toBeInTheDocument();
  });

  it('falls back to Tax when no breakdown component name can be derived', () => {
    renderWithProviders(<CartSummary summary={summary} quote={createQuote({})} />);

    expect(screen.getByText('Tax')).toBeInTheDocument();
    expect(screen.queryByText(/Tax \(/)).not.toBeInTheDocument();
  });

  it('renders multiple tax components as quiet breakdown rows under the total tax row', () => {
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({
        gstCents: 300,
        gstRatePpm: 50000,
        pstCents: 420,
        pstRatePpm: 70000,
      }, 720)}
    />);

    const totals = screen.getByTestId('cart-summary-backend-totals');

    expect(within(totals).getByText('Tax')).toBeInTheDocument();
    expect(within(totals).getByText('$7.20')).toBeInTheDocument();
    expect(within(totals).getByText('GST 5%')).toBeInTheDocument();
    expect(within(totals).getByText('PST 7%')).toBeInTheDocument();
    expect(within(totals).getByText('$3.00')).toBeInTheDocument();
    expect(within(totals).getByText('$4.20')).toBeInTheDocument();
  });

  it('preserves backend quote totals', () => {
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({
        gstCents: 300,
        gstRatePpm: 50000,
        pstCents: 420,
        pstRatePpm: 70000,
      }, 720)}
    />);

    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('$7.20')).toBeInTheDocument();
    expect(screen.getByText('$69.19')).toBeInTheDocument();
  });

  it('does not show client-calculated shipping or a numeric total before a quote', async () => {
    renderWithProviders(<CartSummary summary={summary} />);

    expect(screen.getByText('Calculated after address', { selector: 'span.font-medium' })).toBeInTheDocument();
    expect(screen.getByText('Checkout total')).toBeInTheDocument();
    expect(await screen.findByText(/Free shipping from \$77\.00 in Calgary/)).toBeInTheDocument();
    expect(screen.queryByText('$15.99')).not.toBeInTheDocument();
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
  });

  it('displays authoritative paid and free quote shipping values', () => {
    const paid = renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({}, 500, { shippingCents: 1599, totalCents: 7098 })}
    />);

    expect(screen.getByText('$15.99')).toBeInTheDocument();

    paid.unmount();
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({}, 500, { shippingCents: 0, totalCents: 5499 })}
    />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Free shipping unlocked.')).toBeInTheDocument();
  });

  it('uses only quote-provided regional context for remaining-amount messaging', () => {
    renderWithProviders(<CartSummary
      summary={summary}
      quote={createQuote({}, 500, {
        appliedFreeShippingThresholdCents: 7700,
        shippingRegion: 'calgary',
      })}
    />);

    expect(screen.getByText('You’re $27.01 away from free shipping in Calgary.')).toBeInTheDocument();
  });

  it('omits remaining-amount messaging for a paid legacy quote without policy context', () => {
    renderWithProviders(<CartSummary summary={summary} quote={createQuote({})} />);

    expect(screen.queryByText(/away from free shipping/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Free shipping from/i)).not.toBeInTheDocument();
  });
});
