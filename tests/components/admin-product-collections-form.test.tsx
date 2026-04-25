import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import NewProductPage from '@/app/(admin)/admin/products/new/page';
import { ProductCoreForm } from '@/components/admin/product/product-core-form';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type {
  IAdminProduct,
  IAdminProductEditor,
  ICollection,
  ITag,
} from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const collections: ICollection[] = [
  {
    id: 'collection-1',
    name: 'Featured',
    slug: 'featured',
    description: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'collection-2',
    name: 'Ichiban Kuji',
    slug: 'ichiban-kuji',
    description: null,
    sortOrder: 2,
    isActive: true,
  },
];

function createResponse<T>(data: T): AxiosResponse<IBaseApiResponse<T>> {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  } as AxiosResponse<IBaseApiResponse<T>>;
}

function mockAdminTaxonomies() {
  vi.spyOn(QueryConfigs, 'fetchAdminCollections').mockResolvedValue(createResponse(collections));
  vi.spyOn(QueryConfigs, 'fetchAdminTags').mockResolvedValue(createResponse<ITag[]>([]));
}

function createAdminProduct(overrides: Partial<IAdminProduct> = {}): IAdminProduct {
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
    collections: [],
    tags: [],
    images: [],
    inventory: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

function createAdminProductEditor(
  overrides: Partial<IAdminProductEditor> = {},
): IAdminProductEditor {
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
    collections: [
      {
        id: 'collection-1',
        name: 'Featured',
        slug: 'featured',
      },
    ],
    collectionIds: ['collection-1'],
    inventory: null,
    tags: [],
    tagIds: [],
    images: [],
    kujiPrizes: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('admin product collection forms', () => {
  it('creates products with collectionIds and sends an empty array when none are selected', async () => {
    mockAdminTaxonomies();
    const createProduct = vi.spyOn(MutationConfigs, 'createAdminProduct').mockResolvedValue(
      createResponse(createAdminProduct()),
    );

    renderWithProviders(<NewProductPage />);

    await userEvent.type(screen.getByPlaceholderText('e.g. Mystery Box Vol. 1'), 'New Product');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '19.99');
    const numericInputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(numericInputs[0], '10');
    await userEvent.type(numericInputs[1], '2');
    await userEvent.click(screen.getByRole('button', { name: /Save Product/i }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalled();
    });

    const payload = createProduct.mock.calls[0][0] as unknown as Record<string, unknown>;

    expect(payload.collectionIds).toEqual([]);
    expect(payload).not.toHaveProperty('collectionId');
  });

  it('prefills edit collections and saves multiple collectionIds without collectionId', async () => {
    mockAdminTaxonomies();
    const updateProduct = vi.spyOn(MutationConfigs, 'updateAdminProduct').mockResolvedValue(
      createResponse(createAdminProduct({
        collections: [
          { id: 'collection-1', name: 'Featured', slug: 'featured' },
          { id: 'collection-2', name: 'Ichiban Kuji', slug: 'ichiban-kuji' },
        ],
      })),
    );

    renderWithProviders(
      <ProductCoreForm
        product={createAdminProductEditor()}
        onProductChange={vi.fn()}
      />,
    );

    await screen.findByText('Featured');
    expect(screen.getByText('Choose one or more storefront collections this product should appear in. You can also manage products directly from each collection page.')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Ichiban Kuji'));
    await userEvent.click(screen.getByRole('button', { name: /Save Info/i }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalled();
    });

    const payload = updateProduct.mock.calls[0][0].data as Record<string, unknown>;

    expect(payload.collectionIds).toEqual(['collection-1', 'collection-2']);
    expect(payload).not.toHaveProperty('collectionId');
  });
});
