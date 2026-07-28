import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductVariantsForm } from '@/components/admin/product/product-variants-form';
import type { IAdminProductEditor } from '@/interfaces/product';
import { renderWithProviders } from '@/tests/test-utils';

const mutation = vi.hoisted(() => vi.fn());
const mutationAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-customize-mutation', () => ({
  default: () => ({
    mutation,
    mutationAsync,
    isPending: false,
  }),
}));

const product: IAdminProductEditor = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Variant Figure',
  slug: 'variant-figure',
  description: null,
  productType: 'standard',
  status: 'active',
  priceCents: 2499,
  currency: 'CAD',
  sku: null,
  collections: [],
  collectionIds: [],
  inventory: null,
  tags: [],
  tagIds: [],
  images: [],
  kujiPrizes: [],
  variants: [{
    id: '33333333-3333-4333-8333-333333333333',
    productId: '11111111-1111-4111-8111-111111111111',
    name: 'Default',
    sku: 'FIG-DEFAULT',
    priceCents: 2499,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
    inventory: {
      onHand: 5,
      reserved: 1,
      available: 4,
      lowStockThreshold: 1,
    },
  }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProductVariantsForm', () => {
  beforeEach(() => {
    mutation.mockReset();
    mutationAsync.mockReset();
  });

  it('protects the only default variant and creates an unsaved named variant atomically with inventory', () => {
    renderWithProviders(<ProductVariantsForm product={product} />);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add variant' }).at(-1)!);
    fireEvent.change(screen.getByLabelText('New variant name'), {
      target: { value: 'Blue' },
    });
    fireEvent.change(screen.getByLabelText('New variant SKU'), {
      target: { value: 'FIG-BLUE' },
    });
    fireEvent.change(screen.getByLabelText('New variant price'), {
      target: { value: '34.99' },
    });
    fireEvent.change(screen.getByLabelText('New variant on hand'), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add variant' }).at(-1)!);

    expect(mutation).toHaveBeenCalledWith({
      productId: product.id,
      data: {
        name: 'Blue',
        sku: 'FIG-BLUE',
        priceCents: 3499,
        isActive: true,
        sortOrder: 1,
        inventory: {
          onHand: 8,
          lowStockThreshold: 0,
        },
      },
    });
  });

  it('rejects duplicate names using trimmed case-insensitive comparison', () => {
    renderWithProviders(<ProductVariantsForm product={product} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add variant' }).at(-1)!);
    fireEvent.change(screen.getByLabelText('New variant name'), {
      target: { value: ' default ' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add variant' }).at(-1)!);

    expect(screen.getByText('Variant names must be unique for this product.'))
      .toBeVisible();
    expect(mutation).not.toHaveBeenCalled();
  });
});
