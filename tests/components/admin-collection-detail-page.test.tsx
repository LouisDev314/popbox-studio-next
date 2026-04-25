import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import AdminCollectionDetailPageClient from '@/components/admin/collections/admin-collection-detail-page';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type {
  IAdminProduct,
  IAdminProductListItem,
  IAdminProductListResponse,
  ICollection,
} from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

beforeAll(() => {
  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as typeof PointerEvent;
  }
});

const collections: ICollection[] = [
  {
    id: 'collection-1',
    name: 'Featured',
    slug: 'featured',
    description: 'Homepage collection',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'collection-2',
    name: 'Kuji Picks',
    slug: 'kuji-picks',
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

function createProduct(overrides: Partial<IAdminProductListItem> = {}): IAdminProductListItem {
  return {
    id: 'product-1',
    name: 'Ichiban Figure',
    slug: 'ichiban-figure',
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
    inventory: null,
    tags: [],
    primaryImage: {
      storageKey: null,
      altText: 'Ichiban Figure image',
      url: 'https://example.com/figure.jpg',
    },
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

function createAdminProduct(overrides: Partial<IAdminProduct> = {}): IAdminProduct {
  return {
    id: 'product-1',
    name: 'Ichiban Figure',
    slug: 'ichiban-figure',
    description: null,
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

function createProductListResponse(items: IAdminProductListItem[]): IAdminProductListResponse {
  return {
    items,
    nextCursor: null,
  };
}

function mockCollectionDetailQueries({
  allProducts,
  assignedProducts = [],
}: {
  allProducts?: IAdminProductListItem[];
  assignedProducts?: IAdminProductListItem[];
}) {
  vi.spyOn(QueryConfigs, 'fetchAdminCollections').mockResolvedValue(createResponse(collections));
  vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
    createResponse(createProductListResponse(allProducts ?? assignedProducts)),
  );
}

describe('AdminCollectionDetailPageClient', () => {
  it('shows assigned products with merchandising fields', async () => {
    mockCollectionDetailQueries({
      assignedProducts: [
        createProduct(),
      ],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    expect(await screen.findByRole('heading', { name: 'Featured' })).toBeInTheDocument();
    expect(await screen.findAllByText('Ichiban Figure')).not.toHaveLength(0);
    expect(screen.getAllByText('PB-001')).not.toHaveLength(0);
    expect(screen.getAllByText('Active')).not.toHaveLength(0);
    expect(screen.getAllByText('Standard')).not.toHaveLength(0);
    expect(screen.getAllByText('$49.99')).not.toHaveLength(0);
  });

  it('shows the empty state when no products are assigned', async () => {
    mockCollectionDetailQueries({
      assignedProducts: [],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    expect(await screen.findByText('No products in this collection yet.')).toBeInTheDocument();
    expect(screen.getByText('Add products to control what appears on this collection page.')).toBeInTheDocument();
  });

  it('opens the add products dialog', async () => {
    mockCollectionDetailQueries({
      allProducts: [
        createProduct({
          id: 'product-2',
          name: 'Kuji Set',
          collections: [],
          productType: 'kuji',
        }),
      ],
      assignedProducts: [],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));

    expect(await screen.findByRole('heading', { name: 'Add products' })).toBeInTheDocument();
    expect(await screen.findByText('Kuji Set')).toBeInTheDocument();
  });

  it('does not allow already-assigned products to be selected again', async () => {
    const assignedProduct = createProduct();
    mockCollectionDetailQueries({
      allProducts: [assignedProduct],
      assignedProducts: [assignedProduct],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    const checkbox = await screen.findByLabelText('Ichiban Figure already in collection');

    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add products' })).toBeDisabled();
  });

  it('adds selected products with preserved collection ids', async () => {
    const assignedProduct = createProduct();
    const unassignedProduct = createProduct({
      id: 'product-2',
      name: 'Prize Plush',
      sku: 'PB-002',
      collections: [
        {
          id: 'collection-2',
          name: 'Kuji Picks',
          slug: 'kuji-picks',
        },
      ],
    });
    mockCollectionDetailQueries({
      allProducts: [assignedProduct, unassignedProduct],
      assignedProducts: [assignedProduct],
    });
    const updateProduct = vi.spyOn(MutationConfigs, 'updateAdminProduct').mockResolvedValue(
      createResponse(createAdminProduct({ id: 'product-2' })),
    );

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    await userEvent.click(await screen.findByLabelText('Select Prize Plush'));
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 products' }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith({
        productId: 'product-2',
        data: {
          collectionIds: ['collection-2', 'collection-1'],
        },
      });
    });

    const payload = updateProduct.mock.calls[0][0].data as Record<string, unknown>;
    expect(payload).not.toHaveProperty('collectionId');
  });

  it('removes only the current collection id from a product', async () => {
    const product = createProduct({
      collections: [
        {
          id: 'collection-1',
          name: 'Featured',
          slug: 'featured',
        },
        {
          id: 'collection-2',
          name: 'Kuji Picks',
          slug: 'kuji-picks',
        },
      ],
    });
    mockCollectionDetailQueries({
      assignedProducts: [product],
    });
    const updateProduct = vi.spyOn(MutationConfigs, 'updateAdminProduct').mockResolvedValue(
      createResponse(createAdminProduct()),
    );

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: /Remove/i }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith({
        productId: 'product-1',
        data: {
          collectionIds: ['collection-2'],
        },
      });
    });
  });

  it('shows a friendly error when an add partially fails', async () => {
    const firstProduct = createProduct({
      id: 'product-2',
      name: 'Prize Plush',
      collections: [],
    });
    const secondProduct = createProduct({
      id: 'product-3',
      name: 'Acrylic Stand',
      collections: [],
    });
    mockCollectionDetailQueries({
      allProducts: [firstProduct, secondProduct],
      assignedProducts: [],
    });
    vi.spyOn(MutationConfigs, 'updateAdminProduct').mockImplementation(({ productId }) => {
      if (productId === 'product-3') {
        return Promise.reject(new Error('Request failed'));
      }

      return Promise.resolve(createResponse(createAdminProduct({ id: productId })));
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    await userEvent.click(await screen.findByLabelText('Select Prize Plush'));
    await userEvent.click(await screen.findByLabelText('Select Acrylic Stand'));
    await userEvent.click(screen.getByRole('button', { name: 'Add 2 products' }));

    expect(await screen.findByText('1 product could not be added. Please try again.')).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith('1 product could not be added. Please try again.');
  });
});
