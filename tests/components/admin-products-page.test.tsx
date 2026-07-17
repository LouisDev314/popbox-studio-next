import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const replace = vi.fn();
const push = vi.fn();
let currentSearchParams = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

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
): IAdminProductListResponse {
  return {
    items,
    nextCursor,
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
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      currentSearchParams = url.split('?')[1] ?? '';
    });
    push.mockReset();
    vi.spyOn(QueryConfigs, 'fetchAdminCollections').mockResolvedValue(createResponse(collections));
    vi.spyOn(QueryConfigs, 'fetchAdminTags').mockResolvedValue(createResponse(tags));
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

  it('load more appends rows using nextCursor', async () => {
    const fetchProducts = vi.spyOn(QueryConfigs, 'fetchAdminProducts').mockImplementation((filters) => (
      Promise.resolve(createResponse(createProductListResponse(
        filters.cursor
          ? [createProduct({ id: 'product-2', name: 'Second Figure', slug: 'second-figure' })]
          : [createProduct()],
        filters.cursor ? null : 'cursor-2',
      )))
    ));

    renderWithProviders(<AdminProductsPage />);

    expect(await screen.findAllByText('Hero Figure')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Load More' }));

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
    expect(await screen.findAllByText('Second Figure')).not.toHaveLength(0);
    expect(screen.getAllByText('Hero Figure')).not.toHaveLength(0);
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
