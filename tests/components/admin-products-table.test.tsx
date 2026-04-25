/* eslint-disable @next/next/no-img-element */
import type { AnchorHTMLAttributes } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminProductsTable } from '@/components/admin/admin-products-table';
import type { IAdminProductListItem } from '@/interfaces/product';

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: { alt: string; src: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createProduct(overrides: Partial<IAdminProductListItem> = {}): IAdminProductListItem {
  return {
    id: 'prod-1',
    name: 'Hero Figure',
    slug: 'hero-figure',
    productType: 'standard',
    status: 'active',
    priceCents: 2499,
    currency: 'CAD',
    sku: 'HF-001',
    collections: [
      {
        id: 'collection-1',
        name: 'Featured',
        slug: 'featured',
      },
    ],
    inventory: {
      onHand: 8,
      reserved: 2,
      available: 6,
      lowStockThreshold: 2,
    },
    tags: [
      { id: 'tag-1', name: 'Anime', slug: 'anime', tagType: 'category' },
      { id: 'tag-2', name: 'Limited', slug: 'limited', tagType: 'theme' },
    ],
    primaryImage: {
      url: 'https://cdn.example.com/hero.jpg',
      storageKey: 'products/hero.jpg',
      altText: 'Hero thumbnail',
    },
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminProductsTable', () => {
  it('renders collection and tag chips from the strict list contract', () => {
    render(
      <AdminProductsTable
        hasActiveView={false}
        isPatching={false}
        onClearView={() => {}}
        onRowClick={() => {}}
        onStatusChange={() => {}}
        products={[createProduct()]}
      />,
    );

    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Anime').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Limited').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Hero thumbnail').at(0)).toHaveAttribute('src', 'https://cdn.example.com/hero.jpg');
  });

  it('renders multiple collection chips and the no collections fallback', () => {
    render(
      <AdminProductsTable
        hasActiveView={false}
        isPatching={false}
        onClearView={() => {}}
        onRowClick={() => {}}
        onStatusChange={() => {}}
        products={[
          createProduct({
            collections: [
              { id: 'collection-1', name: 'Featured', slug: 'featured' },
              { id: 'collection-2', name: 'Ichiban Kuji', slug: 'ichiban-kuji' },
              { id: 'collection-3', name: 'New Arrivals', slug: 'new-arrivals' },
            ],
          }),
          createProduct({
            id: 'prod-2',
            collections: [],
          }),
        ]}
      />,
    );

    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ichiban Kuji').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+1 more').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No collections').length).toBeGreaterThan(0);
  });

  it('treats tags: [] and primaryImage: null as valid empty states', () => {
    render(
      <AdminProductsTable
        hasActiveView={false}
        isPatching={false}
        onClearView={() => {}}
        onRowClick={() => {}}
        onStatusChange={() => {}}
        products={[
          createProduct({
            tags: [],
            primaryImage: null,
          }),
        ]}
      />,
    );

    expect(screen.getAllByText('HF').length).toBeGreaterThan(0);
    expect(screen.queryByText('Missing tags field')).not.toBeInTheDocument();
    expect(screen.queryByText('Missing primaryImage field')).not.toBeInTheDocument();
  });

  it('renders the mobile card list alongside the desktop table structure', () => {
    render(
      <AdminProductsTable
        hasActiveView={false}
        isPatching={false}
        onClearView={() => {}}
        onRowClick={() => {}}
        onStatusChange={() => {}}
        products={[createProduct()]}
      />,
    );

    expect(screen.getByTestId('admin-products-mobile-list')).toBeInTheDocument();
    expect(screen.getAllByText('Inventory').length).toBeGreaterThan(0);
  });

  it('shows inline contract badges when required list fields are missing', () => {
    const invalidProduct = {
      id: 'prod-2',
      name: 'Broken Figure',
      slug: 'broken-figure',
      productType: 'standard',
      status: 'active',
      priceCents: 1800,
      currency: 'CAD',
      sku: 'BROKEN-001',
      collections: [
        {
          id: 'collection-1',
          name: 'Featured',
          slug: 'featured',
        },
      ],
      inventory: {
        onHand: 4,
        reserved: 0,
        lowStockThreshold: 1,
      },
      updatedAt: '2026-04-01T00:00:00.000Z',
    } as unknown as IAdminProductListItem;

    render(
      <AdminProductsTable
        hasActiveView={false}
        isPatching={false}
        onClearView={() => {}}
        onRowClick={() => {}}
        onStatusChange={() => {}}
        products={[invalidProduct]}
      />,
    );

    expect(screen.getAllByText('Missing tags field').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missing primaryImage field').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missing inventory.available').length).toBeGreaterThan(0);
  });
});
