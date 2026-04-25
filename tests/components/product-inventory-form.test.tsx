import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import MutationConfigs from '@/configs/api/mutation-config';
import { ProductInventoryForm } from '@/components/admin/product/product-inventory-form';
import type { IAdminProductEditor } from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';

function createAdminProductEditor(): IAdminProductEditor {
  return {
    id: 'product-1',
    name: 'Ichiban Figure',
    slug: 'ichiban-figure',
    description: 'Premium collectible figure',
    productType: 'standard',
    status: 'active',
    priceCents: 4999,
    currency: 'CAD',
    sku: 'PB-001',
    collection: null,
    collectionId: null,
    inventory: {
      onHand: 10,
      reserved: 2,
      available: 8,
      lowStockThreshold: 3,
    },
    tags: [],
    tagIds: [],
    images: [],
    kujiPrizes: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  };
}

function createApiError(message: string) {
  return new AxiosError('Request failed with status code 400', undefined, undefined, undefined, {
    data: {
      status: 'error',
      code: 400,
      success: false,
      message,
      data: null,
    },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  });
}

describe('ProductInventoryForm', () => {
  it('renders backend save failures in a destructive alert', async () => {
    vi.spyOn(MutationConfigs, 'updateAdminProductInventory').mockRejectedValueOnce(
      createApiError('Inventory cannot be lower than reserved quantity.'),
    );

    renderWithProviders(
      <ProductInventoryForm
        product={createAdminProductEditor()}
        onProductChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Save Inventory/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');

      expect(alert).toHaveTextContent('Something went wrong');
      expect(alert).toHaveTextContent('Inventory cannot be lower than reserved quantity.');
    });
  });
});
