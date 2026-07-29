import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import AdminCollectionDetailPageClient from '@/components/admin/collections/admin-collection-detail-page';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type {
  IAdminProduct,
  IAdminFeaturedOrderItem,
  IAdminProductListItem,
  IAdminProductListResponse,
  ICollection,
} from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';
import { buildAdminProductListKeyParams } from '@/lib/admin-product-filters';
import { adminProductKeys } from '@/lib/admin-query-keys';

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
let intersectionObservers: MockIntersectionObserver[] = [];

class MockIntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[] = [0];
  private readonly callback: IntersectionObserverCallback;
  private observedElement: Element | null = null;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    intersectionObservers.push(this);
  }

  disconnect = vi.fn();

  observe = vi.fn((element: Element) => {
    this.observedElement = element;
  });

  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  unobserve = vi.fn();

  trigger(isIntersecting = true) {
    if (!this.observedElement) {
      throw new Error('Cannot trigger an observer before an element is observed.');
    }

    this.callback([
      {
        boundingClientRect: this.observedElement.getBoundingClientRect(),
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: this.observedElement.getBoundingClientRect(),
        isIntersecting,
        rootBounds: null,
        target: this.observedElement,
        time: 0,
      },
    ], this as unknown as IntersectionObserver);
  }
}

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

beforeEach(() => {
  intersectionObservers = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
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

function createProductListResponse(
  items: IAdminProductListItem[],
  nextCursor: string | null = null,
  totalCount = items.length,
): IAdminProductListResponse {
  return {
    items,
    nextCursor,
    totalCount,
  };
}

function toFeaturedOrderItem(product: IAdminProductListItem, sortOrder: number): IAdminFeaturedOrderItem {
  return {
    id: product.id,
    name: product.name,
    productType: product.productType,
    status: product.status,
    sortOrder,
    collections: product.collections,
    primaryImage: product.primaryImage,
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
  vi.spyOn(QueryConfigs, 'fetchAdminFeaturedOrder').mockResolvedValue(
    createResponse({
      items: assignedProducts.map(toFeaturedOrderItem),
      membershipSignature: 'a'.repeat(64),
    }),
  );
}

describe('AdminCollectionDetailPageClient', () => {
  it('shows Featured products in the dedicated storefront order', async () => {
    mockCollectionDetailQueries({
      assignedProducts: [
        createProduct(),
      ],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    expect(await screen.findByRole('heading', { name: 'Featured' })).toBeInTheDocument();
    expect(await screen.findAllByText('Ichiban Figure')).not.toHaveLength(0);
    expect((await screen.findAllByAltText('Ichiban Figure image')).every(
      (image) => image.getAttribute('src') === 'https://example.com/figure.jpg',
    )).toBe(true);
    expect(screen.getAllByText('Active')).not.toHaveLength(0);
    expect(screen.getAllByText('Standard')).not.toHaveLength(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('shows the empty state when no products are assigned', async () => {
    mockCollectionDetailQueries({
      assignedProducts: [],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    expect(await screen.findByText('No Featured products yet.')).toBeInTheDocument();
    expect(screen.getByText('Add a product and it will be placed at the end of this list.')).toBeInTheDocument();
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

  it('excludes products that are already assigned to the collection', async () => {
    const assignedProduct = createProduct();
    mockCollectionDetailQueries({
      allProducts: [assignedProduct],
      assignedProducts: [assignedProduct],
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));

    expect(await screen.findByText('No eligible products are available.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select Ichiban Figure')).not.toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add products' })).toBeDisabled();
  });

  it('loads and appends the next cursor once, deduplicates products, and preserves selection', async () => {
    const firstProduct = createProduct({
      id: 'product-page-1',
      name: 'Page One Product',
      collections: [],
    });
    const secondProduct = createProduct({
      id: 'product-page-2',
      name: 'Page Two Product',
      collections: [],
    });
    mockCollectionDetailQueries({ allProducts: [firstProduct], assignedProducts: [] });
    const fetchProducts = vi.mocked(QueryConfigs.fetchAdminProducts);
    fetchProducts.mockImplementation((filters = {}) => Promise.resolve(createResponse(
      filters.cursor === 'cursor-2'
        ? createProductListResponse([firstProduct, secondProduct], null, 2)
        : createProductListResponse([firstProduct], 'cursor-2', 2),
    )));

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    await userEvent.click(await screen.findByLabelText('Select Page One Product'));
    const productList = screen.getByLabelText('Eligible products');
    await waitFor(() => expect(intersectionObservers).toHaveLength(1));

    expect(intersectionObservers[0].root).toBe(productList);
    expect(intersectionObservers[0].rootMargin).toBe('200px 0px');
    intersectionObservers[0].trigger();
    intersectionObservers[0].trigger();

    expect(await screen.findByText('Page Two Product')).toBeInTheDocument();
    expect(screen.getAllByText('Page One Product')).toHaveLength(1);
    expect(screen.getByLabelText('Select Page One Product')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({
      cursor: undefined,
      excludeCollectionId: 'collection-1',
      limit: 25,
    }));
    expect(fetchProducts.mock.calls.filter(([filters]) => filters?.cursor === 'cursor-2')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));

    expect(await screen.findByText('Page Two Product')).toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(fetchProducts.mock.calls.filter(([filters]) => filters?.cursor === 'cursor-2')).toHaveLength(1);
  });

  it('does not create a pagination observer after the final page', async () => {
    const onlyProduct = createProduct({
      id: 'only-product',
      name: 'Only Product',
      collections: [],
    });
    mockCollectionDetailQueries({ allProducts: [onlyProduct], assignedProducts: [] });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));

    expect(await screen.findByText('Only Product')).toBeInTheDocument();
    expect(intersectionObservers).toHaveLength(0);
  });

  it('automatically appends every page of a non-Featured collection against the viewport', async () => {
    const firstProduct = createProduct({
      id: 'member-page-1',
      name: 'First Collection Member',
      collections: [collections[1]],
    });
    const secondProduct = createProduct({
      id: 'member-page-2',
      name: 'Second Collection Member',
      collections: [collections[1]],
    });
    mockCollectionDetailQueries({ assignedProducts: [firstProduct] });
    const fetchProducts = vi.mocked(QueryConfigs.fetchAdminProducts);
    fetchProducts.mockImplementation((filters = {}) => Promise.resolve(createResponse(
      filters.cursor === 'member-cursor'
        ? createProductListResponse([secondProduct], null, 2)
        : createProductListResponse([firstProduct], 'member-cursor', 2),
    )));

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-2" />);

    expect(await screen.findAllByText('First Collection Member')).not.toHaveLength(0);
    await waitFor(() => expect(intersectionObservers).toHaveLength(1));
    expect(intersectionObservers[0].root).toBeNull();
    intersectionObservers[0].trigger();

    expect(await screen.findAllByText('Second Collection Member')).not.toHaveLength(0);
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({
      collectionId: 'collection-2',
      cursor: 'member-cursor',
    }));
  });

  it('restarts pagination for debounced search without appending a stale previous page', async () => {
    const firstProduct = createProduct({
      id: 'old-first',
      name: 'Original Product',
      collections: [],
    });
    const staleProduct = createProduct({
      id: 'old-second',
      name: 'Stale Product',
      collections: [],
    });
    const searchProduct = createProduct({
      id: 'search-result',
      name: 'Hero Search Result',
      collections: [],
    });
    let resolveStalePage: ((response: AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>) => void) | undefined;
    const stalePage = new Promise<AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>>((resolve) => {
      resolveStalePage = resolve;
    });
    mockCollectionDetailQueries({ allProducts: [firstProduct], assignedProducts: [] });
    const fetchProducts = vi.mocked(QueryConfigs.fetchAdminProducts);
    fetchProducts.mockImplementation((filters = {}) => {
      if (filters.cursor === 'old-cursor') {
        return stalePage;
      }

      if (filters.search === 'hero') {
        return Promise.resolve(createResponse(createProductListResponse([searchProduct])));
      }

      return Promise.resolve(createResponse(createProductListResponse([firstProduct], 'old-cursor', 2)));
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    await userEvent.click(await screen.findByLabelText('Select Original Product'));
    await waitFor(() => expect(intersectionObservers).toHaveLength(1));
    intersectionObservers[0].trigger();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search products' }), 'hero');

    expect(await screen.findByText('Hero Search Result')).toBeInTheDocument();
    expect(screen.queryByText('Original Product')).not.toBeInTheDocument();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({
      cursor: undefined,
      search: 'hero',
    }));

    resolveStalePage?.(createResponse(createProductListResponse([staleProduct])));
    await waitFor(() => {
      expect(screen.queryByText('Stale Product')).not.toBeInTheDocument();
    });
  });

  it('lets the user retry a failed next page', async () => {
    const firstProduct = createProduct({
      id: 'retry-first',
      name: 'Retry First Product',
      collections: [],
    });
    const recoveredProduct = createProduct({
      id: 'retry-second',
      name: 'Recovered Product',
      collections: [],
    });
    let cursorAttempts = 0;
    mockCollectionDetailQueries({ allProducts: [firstProduct], assignedProducts: [] });
    const fetchProducts = vi.mocked(QueryConfigs.fetchAdminProducts);
    fetchProducts.mockImplementation((filters = {}) => {
      if (filters.cursor === 'retry-cursor') {
        cursorAttempts += 1;
        return cursorAttempts === 1
          ? Promise.reject(new Error('Next page failed'))
          : Promise.resolve(createResponse(createProductListResponse([recoveredProduct])));
      }

      return Promise.resolve(createResponse(createProductListResponse([firstProduct], 'retry-cursor', 2)));
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));
    await waitFor(() => expect(intersectionObservers).toHaveLength(1));
    intersectionObservers[0].trigger();

    expect(await screen.findByText('More products could not be loaded.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Recovered Product')).toBeInTheDocument();
    expect(cursorAttempts).toBe(2);
  });

  it('shows an initial load error and retries from the first page', async () => {
    const recoveredProduct = createProduct({
      id: 'initial-recovered',
      name: 'Initially Recovered Product',
      collections: [],
    });
    let modalAttempts = 0;
    mockCollectionDetailQueries({ allProducts: [], assignedProducts: [] });
    const fetchProducts = vi.mocked(QueryConfigs.fetchAdminProducts);
    fetchProducts.mockImplementation((filters = {}) => {
      if (filters.limit === 25) {
        modalAttempts += 1;
        return modalAttempts === 1
          ? Promise.reject(new Error('Initial page failed'))
          : Promise.resolve(createResponse(createProductListResponse([recoveredProduct])));
      }

      return Promise.resolve(createResponse(createProductListResponse([])));
    });

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Add products/i }));

    expect(await screen.findByText('Unable to load products. Please try again.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Initially Recovered Product')).toBeInTheDocument();
    expect(modalAttempts).toBe(2);
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

  it('keeps Featured removal local until the order is saved', async () => {
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
    const updateProduct = vi.spyOn(MutationConfigs, 'updateAdminProduct');
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockResolvedValue(
      createResponse({ items: [], membershipSignature: 'b'.repeat(64) }),
    );

    const { queryClient } = renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);
    const cachedProductKey = adminProductKeys.list(buildAdminProductListKeyParams({}));
    queryClient.setQueryData(cachedProductKey, {
      pages: [createProductListResponse([product])],
      pageParams: [undefined],
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Ichiban Figure from Featured' }));

    expect(updateProduct).not.toHaveBeenCalled();
    expect(screen.queryByText('Ichiban Figure')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(updateOrder.mock.calls[0]?.[0]).toEqual({
      membershipSignature: 'a'.repeat(64),
      productIds: [],
    }));
    await waitFor(() => {
      const cachedProducts = queryClient.getQueryData<{
        pages: IAdminProductListResponse[];
        pageParams: unknown[];
      }>(cachedProductKey);
      expect(cachedProducts?.pages[0]?.items[0]?.collections).toEqual([
        { id: 'collection-2', name: 'Kuji Picks', slug: 'kuji-picks' },
      ]);
    });
  });

  it('reconciles a locally added Featured product and saves with the confirmed signature', async () => {
    const currentProduct = createProduct();
    const addedProduct = createProduct({
      id: 'product-2',
      name: 'Prize Plush',
      slug: 'prize-plush',
      collections: [],
    });
    mockCollectionDetailQueries({
      allProducts: [addedProduct],
      assignedProducts: [currentProduct],
    });
    vi.mocked(QueryConfigs.fetchAdminFeaturedOrder)
      .mockResolvedValueOnce(createResponse({
        items: [toFeaturedOrderItem(currentProduct, 0)],
        membershipSignature: 'a'.repeat(64),
      }))
      .mockResolvedValue(createResponse({
        items: [
          toFeaturedOrderItem(currentProduct, 0),
          toFeaturedOrderItem({
            ...addedProduct,
            collections: [collections[0]],
          }, 1),
        ],
        membershipSignature: 'b'.repeat(64),
      }));
    vi.spyOn(MutationConfigs, 'updateAdminProduct').mockResolvedValue(
      createResponse(createAdminProduct({ id: addedProduct.id })),
    );
    const updateOrder = vi.spyOn(MutationConfigs, 'updateAdminFeaturedOrder').mockResolvedValue(
      createResponse({
        items: [toFeaturedOrderItem(addedProduct, 0)],
        membershipSignature: 'c'.repeat(64),
      }),
    );

    renderWithProviders(<AdminCollectionDetailPageClient collectionId="collection-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Ichiban Figure from Featured' }));
    await userEvent.click(screen.getByRole('button', { name: /Add products/i }));
    await userEvent.click(await screen.findByLabelText('Select Prize Plush'));
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 products' }));

    await waitFor(() => expect(screen.queryByText(/membership changed while you were editing/i)).not.toBeInTheDocument());
    expect(await screen.findByText('Prize Plush')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }));

    await waitFor(() => expect(updateOrder.mock.calls[0]?.[0]).toEqual({
      membershipSignature: 'b'.repeat(64),
      productIds: ['product-2'],
    }));
    expect(screen.queryByText(/membership changed while you were editing/i)).not.toBeInTheDocument();
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
