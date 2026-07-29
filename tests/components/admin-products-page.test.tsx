import { useEffect, useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminProductsPage from '@/components/admin/admin-products-page';
import QueryConfigs from '@/configs/api/query-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type {
  IAdminProductListItem,
  IAdminProductListResponse,
  ICollection,
  ITag,
} from '@/interfaces/product';
import { renderWithProviders } from '../test-utils';
import {
  installMockIntersectionObserver,
  mockIntersectionObservers,
} from '../mock-intersection-observer';

const replace = vi.fn();
const push = vi.fn();
let currentSearchParams = '';
let memoizedSearchParamsValue = '';
let memoizedSearchParams = new URLSearchParams();
let rerenderAdminProductsRoute: (() => void) | undefined;

function getCurrentSearchParams() {
  if (memoizedSearchParamsValue !== currentSearchParams) {
    memoizedSearchParamsValue = currentSearchParams;
    memoizedSearchParams = new URLSearchParams(currentSearchParams);
  }

  return memoizedSearchParams;
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
  }),
  useSearchParams: getCurrentSearchParams,
}));

function AdminProductsRouteHarness() {
  const [, setRouteVersion] = useState(0);

  useEffect(() => {
    rerenderAdminProductsRoute = () => setRouteVersion((version) => version + 1);

    return () => {
      rerenderAdminProductsRoute = undefined;
    };
  }, []);

  return <AdminProductsPage />;
}

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
    name: 'Hero Figure',
    slug: 'hero-figure',
    productType: 'standard',
    status: 'active',
    priceCents: 2499,
    currency: 'CAD',
    sku: 'HF-001',
    collections: [{ id: 'collection-1', name: 'Featured', slug: 'featured' }],
    inventory: {
      onHand: 8,
      reserved: 2,
      available: 6,
      lowStockThreshold: 2,
    },
    tags: [{ id: 'tag-1', name: 'Anime', slug: 'anime', tagType: 'category' }],
    primaryImage: null,
    updatedAt: '2026-04-01T00:00:00.000Z',
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

const collections: ICollection[] = [
  {
    id: 'collection-1',
    name: 'Featured',
    slug: 'featured',
    description: null,
    sortOrder: 1,
    isActive: true,
  },
];

const tags: ITag[] = [
  {
    id: 'tag-1',
    name: 'Anime',
    slug: 'anime',
    tagType: 'category',
  },
];

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentSearchParams = '';
    rerenderAdminProductsRoute = undefined;
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      currentSearchParams = url.split('?')[1] ?? '';
      rerenderAdminProductsRoute?.();
    });
    push.mockReset();
    vi.spyOn(QueryConfigs, 'fetchAdminCollections').mockResolvedValue(createResponse(collections));
    vi.spyOn(QueryConfigs, 'fetchAdminTags').mockResolvedValue(createResponse(tags));
    installMockIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('links to the focused Featured ordering surface', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([])),
    );

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findByRole('link', { name: 'Manage Featured order' })).toHaveAttribute(
      'href',
      '/admin/collections/collection-1',
    );
  });

  it('replaces the initial loading label with the authoritative API total', async () => {
    let resolveProducts: (
      response: AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>,
    ) => void = () => undefined;
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockReturnValue(new Promise((resolve) => {
      resolveProducts = resolve;
    }));

    renderWithProviders(<AdminProductsPage />);

    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('Loading product count…');

    resolveProducts(createResponse(createProductListResponse([createProduct()], null, 26)));

    expect(await screen.findByText('26 products')).toBeInTheDocument();
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('1 product');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('Loading product count…');
  });

  it('uses singular product text for a total of one', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct()], null, 1)),
    );

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findByText('1 product')).toBeInTheDocument();
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('1 products');
  });

  it('does not strand the count when equivalent URLs reorder or omit default params', async () => {
    currentSearchParams = 'sort=updated_desc&tagId=all&status=all&collectionId=all&productType=all';
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct()], null, 26)),
    );

    renderWithProviders(<AdminProductsRouteHarness />);

    expect(await screen.findByText('26 products')).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledTimes(1);

    currentSearchParams = '';
    await act(async () => {
      rerenderAdminProductsRoute?.();
    });

    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('26 products');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('Loading product count…');
    expect(fetchProducts).toHaveBeenCalledTimes(1);
  });

  it('does not clear a cached count when the active normalized search is resubmitted', async () => {
    currentSearchParams = 'search=hero';
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct()], null, 2)),
    );

    renderWithProviders(<AdminProductsRouteHarness />);

    expect(await screen.findByText('2 products')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero', { scroll: false });
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('2 products');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('Loading product count…');
    expect(fetchProducts).toHaveBeenCalledTimes(1);
  });

  it('clears the previous count while a changed filter query is loading, then displays the new total', async () => {
    let resolveActiveResponse: ((response: AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>) => void) | undefined;
    const activeResponse = new Promise<AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>>((resolve) => {
      resolveActiveResponse = resolve;
    });
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockImplementation((filters) => (
      filters?.status === 'active'
        ? activeResponse
        : Promise.resolve(createResponse(createProductListResponse([createProduct()], null, 26)))
    ));
    renderWithProviders(<AdminProductsRouteHarness />);

    expect(await screen.findByText('26 products')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Active' })[0]);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'active' }));
    });
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('Loading product count…');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('26 products');

    resolveActiveResponse?.(
      createResponse(createProductListResponse([createProduct()], null, 21)),
    );

    expect(await screen.findByText('21 products')).toBeInTheDocument();
  });

  it('updates the total for search and restores it when search is cleared', async () => {
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockImplementation((filters) => (
      Promise.resolve(createResponse(createProductListResponse(
        [createProduct()],
        null,
        filters?.search ? 2 : 26,
      )))
    ));
    renderWithProviders(<AdminProductsRouteHarness />);

    expect(await screen.findByText('26 products')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'hero');
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(await screen.findByText('2 products')).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'hero' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear search products' }));

    expect(await screen.findByText('26 products')).toBeInTheDocument();
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('2 products');
  });

  it('keeps a valid count visible during a background refetch of the same query', async () => {
    let resolveRefetch: (
      response: AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>,
    ) => void = () => undefined;
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts')
      .mockResolvedValueOnce(createResponse(createProductListResponse([createProduct()], null, 26)))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveRefetch = resolve;
      }));
    const view = renderWithProviders(<AdminProductsPage />);

    expect(await screen.findByText('26 products')).toBeInTheDocument();

    void view.queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'list'] });

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('26 products');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('Loading product count…');

    resolveRefetch(createResponse(createProductListResponse([createProduct()], null, 25)));

    expect(await screen.findByText('25 products')).toBeInTheDocument();
  });

  it('sends canonical search, filter, sort, cursor, and limit params to the backend', async () => {
    currentSearchParams = 'search=hero&status=active&productType=kuji&collectionId=collection-1&tagId=tag-1&sort=price_desc';
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct({ productType: 'kuji' })])),
    );

    renderWithProviders(<AdminProductsPage />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        collectionId: 'collection-1',
        cursor: undefined,
        limit: 25,
        productType: 'kuji',
        search: 'hero',
        sort: 'price_desc',
        status: 'active',
        tagId: 'tag-1',
      });
    });
    const params = fetchProducts.mock.calls[0][0];
    expect(params).not.toHaveProperty('type');
    expect(params).not.toHaveProperty('tagIds');
  });

  it('search, filters, and sort update URL state and reset pagination', async () => {
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct()], 'cursor-2')),
    );
    let view = renderWithProviders(<AdminProductsPage />);

    await screen.findAllByText('Hero Figure');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'hero');
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith({
        collectionId: 'all',
        cursor: undefined,
        limit: 25,
        productType: 'all',
        search: 'hero',
        sort: 'updated_desc',
        status: 'all',
        tagId: 'all',
      });
    });

    await userEvent.selectOptions(screen.getByLabelText('Product Type'), 'kuji');
    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero&productType=kuji', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await screen.findByRole('option', { name: 'Featured' });
    await userEvent.selectOptions(await screen.findByLabelText('Collection'), 'collection-1');
    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero&productType=kuji&collectionId=collection-1', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await screen.findByRole('option', { name: 'Anime (Category)' });
    await userEvent.selectOptions(await screen.findByLabelText('Tag'), 'tag-1');
    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero&productType=kuji&collectionId=collection-1&tagId=tag-1', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'inventory_asc');
    expect(replace).toHaveBeenLastCalledWith('/admin/products?search=hero&productType=kuji&collectionId=collection-1&tagId=tag-1&sort=inventory_asc', { scroll: false });
    view.unmount();
    renderWithProviders(<AdminProductsPage />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith({
        collectionId: 'collection-1',
        cursor: undefined,
        limit: 25,
        productType: 'kuji',
        search: 'hero',
        sort: 'inventory_asc',
        status: 'all',
        tagId: 'tag-1',
      });
    });
  });

  it('removes search from the URL when submitting an empty product search', async () => {
    currentSearchParams = 'search=kuji';
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct({ name: 'Kuji Figure' })])),
    );

    let view = renderWithProviders(<AdminProductsPage />);

    const searchInput = screen.getByRole('searchbox', { name: 'Search products' });

    await screen.findAllByText('Kuji Figure');
    await userEvent.clear(searchInput);
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/products', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith({
        collectionId: 'all',
        cursor: undefined,
        limit: 25,
        productType: 'all',
        search: undefined,
        sort: 'updated_desc',
        status: 'all',
        tagId: 'all',
      });
    });
    view.unmount();
  });

  it('removes search from the URL when submitting whitespace product search', async () => {
    currentSearchParams = 'search=kuji';
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct({ name: 'Kuji Figure' })])),
    );

    renderWithProviders(<AdminProductsPage />);

    const searchInput = screen.getByRole('searchbox', { name: 'Search products' });

    await screen.findAllByText('Kuji Figure');
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, '   ');
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(replace).toHaveBeenLastCalledWith('/admin/products', { scroll: false });
  });

  it('removes search from the URL when clearing product search', async () => {
    currentSearchParams = 'search=kuji';
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([createProduct({ name: 'Kuji Figure' })])),
    );

    let view = renderWithProviders(<AdminProductsPage />);

    await screen.findAllByText('Kuji Figure');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search products' }));

    expect(replace).toHaveBeenLastCalledWith('/admin/products', { scroll: false });
    view.unmount();
    view = renderWithProviders(<AdminProductsPage />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith({
        collectionId: 'all',
        cursor: undefined,
        limit: 25,
        productType: 'all',
        search: undefined,
        sort: 'updated_desc',
        status: 'all',
        tagId: 'all',
      });
    });
    view.unmount();
  });

  it('automatically appends rows using nextCursor when the sentinel intersects', async () => {
    let resolveNextPage: (
      response: AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>,
    ) => void = () => undefined;
    const nextPageResponse = new Promise<AxiosResponse<IBaseApiResponse<IAdminProductListResponse>>>((resolve) => {
      resolveNextPage = resolve;
    });
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockImplementation((filters) => (
      filters?.cursor
        ? nextPageResponse
        : Promise.resolve(createResponse(createProductListResponse([createProduct()], 'cursor-2', 26)))
    ));

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findAllByText('Hero Figure')).not.toHaveLength(0);
    await waitFor(() => expect(mockIntersectionObservers).toHaveLength(1));
    expect(mockIntersectionObservers[0].root).toBeNull();
    expect(mockIntersectionObservers[0].rootMargin).toBe('200px 0px');
    mockIntersectionObservers[0].trigger();
    mockIntersectionObservers[0].trigger();

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenLastCalledWith({
        collectionId: 'all',
        cursor: 'cursor-2',
        limit: 25,
        productType: 'all',
        search: undefined,
        sort: 'updated_desc',
        status: 'all',
        tagId: 'all',
      });
    });
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('26 products');
    expect(screen.getByTestId('admin-product-count')).not.toHaveTextContent('Loading product count…');

    resolveNextPage(createResponse(createProductListResponse([
      createProduct({ id: 'product-2', name: 'Second Figure', slug: 'second-figure' }),
    ], null, 26)));

    expect(await screen.findAllByText('Second Figure')).not.toHaveLength(0);
    expect(screen.getAllByText('Hero Figure')).not.toHaveLength(0);
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('26 products');
    expect(fetchProducts.mock.calls.filter(([filters]) => filters?.cursor === 'cursor-2')).toHaveLength(1);
    await waitFor(() => expect(mockIntersectionObservers.at(-1)?.disconnect).toHaveBeenCalled());
  });

  it('keeps existing products visible and retries a failed next page', async () => {
    let cursorAttempts = 0;
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockImplementation((filters) => {
      if (filters?.cursor === 'retry-cursor') {
        cursorAttempts += 1;
        return cursorAttempts === 1
          ? Promise.reject(new Error('next page failed'))
          : Promise.resolve(createResponse(createProductListResponse([
            createProduct({ id: 'product-2', name: 'Recovered Figure' }),
          ])));
      }

      return Promise.resolve(createResponse(createProductListResponse(
        [createProduct()],
        'retry-cursor',
        2,
      )));
    });

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findAllByText('Hero Figure')).not.toHaveLength(0);
    await waitFor(() => expect(mockIntersectionObservers).toHaveLength(1));
    mockIntersectionObservers[0].trigger();

    expect(await screen.findByText('More products could not be loaded.')).toBeInTheDocument();
    expect(screen.getAllByText('Hero Figure')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findAllByText('Recovered Figure')).not.toHaveLength(0);
    expect(screen.getAllByText('Hero Figure')).not.toHaveLength(0);
    expect(cursorAttempts).toBe(2);
  });

  it('does not locally filter loaded product rows', async () => {
    currentSearchParams = 'search=hero';
    vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockResolvedValue(
      createResponse(createProductListResponse([
        createProduct(),
        createProduct({
          id: 'product-2',
          name: 'Villain Plush',
          slug: 'villain-plush',
          sku: 'VP-001',
        }),
      ])),
    );

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findAllByText('Hero Figure')).not.toHaveLength(0);
    expect(screen.getAllByText('Villain Plush')).not.toHaveLength(0);
  });
});
