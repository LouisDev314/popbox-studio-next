import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CartViewTracker,
  ProductListViewTracker,
  ProductViewTracker,
} from '@/components/analytics/ecommerce-trackers';
import type { IProduct } from '@/interfaces/product';
import { createCartItem, createProductCard } from '@/tests/fixtures';

function createProduct(): IProduct {
  return {
    ...createProductCard(),
    sku: 'PB-001',
    tags: [],
    kujiPrizes: [],
    createdAt: '2026-07-12T00:00:00.000Z',
  };
}

function getEventCount(eventName: string) {
  return vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === 'event' && call[1] === eventName).length;
}

describe('ecommerce analytics trackers', () => {
  beforeEach(() => {
    window.__popboxGaReady = true;
    window.gtag = vi.fn();
  });

  it('fires view_item once across Strict Mode-style effect reruns and rerenders', async () => {
    const product = createProduct();
    const { rerender } = render(<ProductViewTracker product={product} />);

    rerender(<ProductViewTracker product={{ ...product }} />);

    await waitFor(() => expect(getEventCount('view_item')).toBe(1));
  });

  it('fires one list impression for the logical rendered list', async () => {
    const products = [createProductCard(), createProductCard({ id: 'product-2' })];
    const list = { id: 'catalog', name: 'Catalog' };
    const { rerender } = render(<ProductListViewTracker list={list} products={products} />);

    rerender(<ProductListViewTracker list={{ ...list }} products={[...products]} />);

    await waitFor(() => expect(getEventCount('view_item_list')).toBe(1));
  });

  it('does not resend view_cart for unrelated rerenders with unchanged cart contents', async () => {
    const items = [createCartItem({ quantity: 2 })];
    const { rerender } = render(<CartViewTracker items={items} />);

    rerender(<CartViewTracker items={[{ ...items[0] }]} />);

    await waitFor(() => expect(getEventCount('view_cart')).toBe(1));
  });
});
