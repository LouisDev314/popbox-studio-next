import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StandardProductPurchasePanel } from '@/components/product/standard-product-purchase-panel';
import type { IProduct } from '@/interfaces/product';
import { createProductCard, VALID_VARIANT_ID } from '@/tests/fixtures';

const actionProps = vi.hoisted(() => vi.fn());

vi.mock('@/components/product/product-actions', () => ({
  ProductActions: (props: unknown) => {
    actionProps(props);
    return <div data-testid="actions" />;
  },
}));

function createProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    ...createProductCard(),
    sku: null,
    tags: [],
    kujiPrizes: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    variants: [{
      id: VALID_VARIANT_ID,
      name: 'Small',
      priceCents: 2499,
      sortOrder: 0,
      isAvailable: true,
    }],
    priceRange: { minCents: 2499, maxCents: 2499, isRange: false },
    ...overrides,
  };
}

describe('StandardProductPurchasePanel', () => {
  it('automatically uses one hidden default variant without showing a selector', () => {
    render(<StandardProductPurchasePanel product={createProduct()} />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(actionProps).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedVariant: expect.objectContaining({ id: VALID_VARIANT_ID }),
    }));
  });

  it('renders minimal responsive options and updates the main price after selection', async () => {
    const user = userEvent.setup();
    const blueId = '44444444-4444-4444-8444-444444444444';
    render(<StandardProductPurchasePanel product={createProduct({
      defaultVariantId: VALID_VARIANT_ID,
      hasVariantChoices: true,
      variants: [
        {
          id: VALID_VARIANT_ID,
          name: 'Small',
          priceCents: 2499,
          sortOrder: 0,
          isAvailable: true,
        },
        {
          id: blueId,
          name: 'Blue',
          priceCents: 3499,
          sortOrder: 1,
          isAvailable: true,
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          name: 'Sold out',
          priceCents: 3999,
          sortOrder: 2,
          isAvailable: false,
        },
      ],
    })} />);

    const fieldset = screen.getByRole('group', { name: 'Variants' });
    const grid = fieldset.querySelector('div');
    const smallRadio = within(fieldset).getByRole('radio', { name: 'Small' });
    const blueRadio = within(fieldset).getByRole('radio', { name: 'Blue' });
    const soldOutRadio = within(fieldset).getByRole('radio', { name: /sold out/i });
    const smallOption = smallRadio.closest('label');
    const blueOption = blueRadio.closest('label');

    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    expect(smallRadio).toHaveClass('sr-only');
    expect(blueRadio).toHaveClass('sr-only');
    expect(soldOutRadio).toHaveClass('sr-only');
    expect(within(fieldset).queryByText('$24.99')).not.toBeInTheDocument();
    expect(within(fieldset).queryByText('$34.99')).not.toBeInTheDocument();
    expect(within(fieldset).queryByText('$39.99')).not.toBeInTheDocument();

    expect(smallRadio).toBeChecked();
    expect(smallOption).toHaveClass(
      'ring-1',
      'ring-primary',
      'bg-card',
      'font-semibold',
      'text-primary',
    );
    expect(blueOption).toHaveClass('bg-card', 'font-normal', 'hover:bg-primary/10');

    await user.click(blueOption!);

    expect(screen.getByText('$34.99')).toBeInTheDocument();
    expect(blueRadio).toBeChecked();
    expect(blueOption).toHaveClass(
      'ring-1',
      'ring-primary',
      'bg-card',
      'font-semibold',
      'text-primary',
    );
    expect(smallOption).toHaveClass('bg-card', 'font-normal', 'hover:bg-primary/10');
    expect(actionProps).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedVariant: expect.objectContaining({ id: blueId }),
    }));
  });

  it('keeps keyboard selection and unavailable variant semantics intact', async () => {
    const user = userEvent.setup();
    render(<StandardProductPurchasePanel product={createProduct({
      defaultVariantId: VALID_VARIANT_ID,
      hasVariantChoices: true,
      variants: [
        {
          id: VALID_VARIANT_ID,
          name: 'Small',
          priceCents: 2499,
          sortOrder: 0,
          isAvailable: true,
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Blue',
          priceCents: 3499,
          sortOrder: 1,
          isAvailable: true,
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          name: 'Sold out',
          priceCents: 3999,
          sortOrder: 2,
          isAvailable: false,
        },
      ],
    })} />);

    const blueRadio = screen.getByRole('radio', { name: 'Blue' });
    const soldOutRadio = screen.getByRole('radio', { name: /sold out/i });

    blueRadio.focus();
    await user.keyboard('[Space]');

    expect(blueRadio).toBeChecked();
    expect(screen.getByText('$34.99')).toBeInTheDocument();
    expect(soldOutRadio).toBeDisabled();
    expect(soldOutRadio.closest('label')).toHaveClass(
      'cursor-not-allowed',
      'border-border/40',
      'bg-muted/40',
      'text-muted-foreground',
    );
  });
});
