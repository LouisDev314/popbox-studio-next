import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FreeShippingStatus } from '@/components/cart/free-shipping-status';
import { DEFAULT_SHIPPING_SETTINGS } from '@/utils/shipping';

describe('FreeShippingStatus', () => {
  it('uses neutral copy while settings are loading', () => {
    render(<FreeShippingStatus mode="generic" settings={null} />);

    expect(screen.getByText('Shipping is calculated from your address at checkout.')).toBeInTheDocument();
    expect(screen.queryByText(/\$77/)).not.toBeInTheDocument();
  });

  it('shows the complete regional policy before destination is known', () => {
    render(<FreeShippingStatus mode="generic" settings={{ ...DEFAULT_SHIPPING_SETTINGS }} />);

    expect(screen.getByText(/\$77\.00 in Calgary/)).toBeInTheDocument();
    expect(screen.getByText(/\$88\.00 in Alberta/)).toBeInTheDocument();
    expect(screen.getByText(/\$149\.00 across Canada/)).toBeInTheDocument();
  });

  it.each([
    ['calgary', 'You’re $17.00 away from free shipping in Calgary.'],
    ['alberta', 'You’re $13.00 away from free shipping in Alberta.'],
    ['canada', 'You’re $29.00 away from free shipping.'],
  ] as const)('renders contextual %s progress', (region, message) => {
    const remainingCents = region === 'calgary' ? 1700 : region === 'alberta' ? 1300 : 2900;

    render(<FreeShippingStatus
      mode="contextual"
      isFree={false}
      progress={{
        qualified: false,
        region,
        remainingCents,
        thresholdCents: 10000,
      }}
    />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('uses backend-free status even without regional quote context', () => {
    render(<FreeShippingStatus mode="contextual" isFree={true} progress={null} />);

    expect(screen.getByText('Free shipping unlocked.')).toBeInTheDocument();
  });

  it('omits progress for a charged legacy quote without context', () => {
    const { container } = render(
      <FreeShippingStatus mode="contextual" isFree={false} progress={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not claim qualification when optional threshold context conflicts with paid shipping', () => {
    const { container } = render(
      <FreeShippingStatus
        mode="contextual"
        isFree={false}
        progress={{
          qualified: true,
          region: 'calgary',
          remainingCents: 0,
          thresholdCents: 7700,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
