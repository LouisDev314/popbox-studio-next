import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FreeShippingStatus } from '@/components/cart/free-shipping-status';
import { DEFAULT_SHIPPING_SETTINGS } from '@/utils/shipping';

const defaultPolicy = 'Free shipping from $77.00 in Calgary, $88.00 in Alberta, or $149.00 across Canada.';

describe('FreeShippingStatus', () => {
  it('uses neutral copy while settings are loading', () => {
    render(<FreeShippingStatus mode="generic" settings={null} />);

    expect(screen.getByText('Shipping is calculated after details are provided.')).toBeInTheDocument();
    expect(screen.queryByText(/\$77/)).not.toBeInTheDocument();
  });

  it('shows the complete regional policy before destination is known', () => {
    render(<FreeShippingStatus mode="generic" settings={{ ...DEFAULT_SHIPPING_SETTINGS }} />);

    expect(screen.getByText(defaultPolicy)).toBeInTheDocument();
  });

  it('shows the complete regional policy for a charged quote', () => {
    render(<FreeShippingStatus
      mode="contextual"
      isFree={false}
      settings={{ ...DEFAULT_SHIPPING_SETTINGS }}
    />);

    expect(screen.getByText(defaultPolicy)).toBeInTheDocument();
    expect(screen.queryByText(/away from free shipping/i)).not.toBeInTheDocument();
  });

  it('formats configurable thresholds from public shipping settings', () => {
    render(<FreeShippingStatus
      mode="contextual"
      isFree={false}
      settings={{
        ...DEFAULT_SHIPPING_SETTINGS,
        calgaryFreeShippingThresholdCents: 8123,
        albertaFreeShippingThresholdCents: 9345,
        freeShippingThresholdCents: 16789,
      }}
    />);

    expect(screen.getByText(
      'Free shipping from $81.23 in Calgary, $93.45 in Alberta, or $167.89 across Canada.',
    )).toBeInTheDocument();
  });

  it('uses backend-free status even without regional quote context', () => {
    render(<FreeShippingStatus mode="contextual" isFree={true} settings={null} />);

    expect(screen.getByText('Free shipping unlocked.')).toBeInTheDocument();
  });

  it('shows neutral settings-loading copy for a charged quote without policy context', () => {
    render(<FreeShippingStatus mode="contextual" isFree={false} settings={null} />);

    expect(screen.getByText('Shipping is calculated after details are provided.')).toBeInTheDocument();
  });
});
