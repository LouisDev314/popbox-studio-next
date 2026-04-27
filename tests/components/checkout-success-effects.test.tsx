import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutSuccessEffects } from '@/app/(store)/checkout/success/checkout-success-effects';
import QueryConfigs from '@/configs/api/query-config';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useWishlistStore } from '@/hooks/use-wishlist';
import type { IOrderDetail, IOrderStatus } from '@/interfaces/order';
import { CART_STORAGE_KEY } from '@/utils/cart-storage';
import { WISHLIST_STORAGE_KEY } from '@/utils/wishlist';
import {
  createCartItem,
  createWishlistItem,
  VALID_PRODUCT_ID,
} from '../fixtures';
import { renderWithProviders } from '../test-utils';

const OTHER_PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

function createOrderItem(
  productId: string,
  quantity: number,
  overrides: Partial<IOrderDetail['items'][number]> = {},
): IOrderDetail['items'][number] {
  return {
    id: `order-item-${productId}`,
    imageAltText: null,
    imageUrl: null,
    lineTotalCents: 4999 * quantity,
    metadata: null,
    productId,
    productName: overrides.productName ?? 'Ichiban Figure',
    productType: 'standard',
    quantity,
    unitPriceCents: 4999,
    ...overrides,
  };
}

function createOrder(
  status: IOrderStatus,
  items: IOrderDetail['items'] = [createOrderItem(VALID_PRODUCT_ID, 1)],
): IOrderDetail {
  return {
    billingAddress: null,
    cancelledAt: null,
    currency: 'CAD',
    customer: {
      email: 'customer@example.com',
      firstName: 'Pop',
      id: 'customer-1',
      lastName: 'Box',
      phone: null,
    },
    id: 'order-1',
    items,
    paidAt: status === 'pending_payment' ? null : '2026-01-01T00:00:00.000Z',
    placedAt: '2026-01-01T00:00:00.000Z',
    publicId: 'pbs-ORDER',
    refundedAt: null,
    shipment: null,
    shippingAddress: {
      city: 'Toronto',
      countryCode: 'CA',
      fullName: 'Pop Box',
      line1: '123 Queen St',
      line2: '',
      postalCode: 'M5H 2N2',
      province: 'ON',
    },
    shippingCents: 0,
    status,
    subtotalCents: 4999,
    taxCents: 0,
    tickets: [],
    totalCents: 4999,
  };
}

function mockCheckoutSuccessAccess() {
  vi.spyOn(QueryConfigs, 'fetchCheckoutSuccess').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<typeof QueryConfigs.fetchCheckoutSuccess>>,
  );
}

function getPersistedCartItems(): Array<{ product: { id: string }; quantity: number }> {
  const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);
  expect(storedValue).not.toBeNull();

  const parsedValue = JSON.parse(storedValue!) as {
    state: {
      items: Array<{ product: { id: string }; quantity: number }>;
    };
  };

  return parsedValue.state.items;
}

function getPersistedWishlistItems(): Array<{ id: string }> {
  const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  expect(storedValue).not.toBeNull();

  const parsedValue = JSON.parse(storedValue!) as {
    state: {
      items: Array<{ id: string }>;
    };
  };

  return parsedValue.state.items;
}

function CheckoutSuccessEffectsHarness(props: { initialOrder: IOrderDetail }) {
  const [order, setOrder] = useState(props.initialOrder);

  return (
    <>
      <CheckoutSuccessEffects sessionId="cs_test_123" order={order} />
      <button
        type="button"
        onClick={() => setOrder({
          ...order,
          placedAt: '2026-01-02T00:00:00.000Z',
        })}
      >
        Refresh order
      </button>
    </>
  );
}

describe('CheckoutSuccessEffects', () => {
  beforeEach(() => {
    mockCheckoutSuccessAccess();
  });

  it('keeps confirmation content hidden until local cart and wishlist cleanup completes', async () => {
    act(() => {
      useCartStore.getState().addItem(createCartItem().product);
      useWishlistStore.getState().addWishlistItem(createWishlistItem());
      useCartStore.getState().setHasHydrated(false);
      useWishlistStore.getState().setHasHydrated(false);
    });

    renderWithProviders(
      <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder('paid')}>
        <h1>Order Confirmed!</h1>
      </CheckoutSuccessEffects>,
    );

    expect(screen.getByRole('status', { name: 'Preparing order confirmation' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Order Confirmed!' })).not.toBeInTheDocument();

    act(() => {
      useCartStore.getState().setHasHydrated(true);
      useWishlistStore.getState().setHasHydrated(true);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order Confirmed!' })).toBeInTheDocument();
    });
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useWishlistStore.getState().items).toHaveLength(0);
  });

  it('removes only purchased cart and wishlist items for paid orders', async () => {
    act(() => {
      useCartStore.getState().addItem(createCartItem().product);
      useCartStore.getState().addItem(
        createCartItem({
          product: {
            id: OTHER_PRODUCT_ID,
            name: 'Unrelated Figure',
            slug: 'unrelated-figure',
          },
        }).product,
      );
      useWishlistStore.getState().addWishlistItem(createWishlistItem());
      useWishlistStore.getState().addWishlistItem(
        createWishlistItem({
          id: OTHER_PRODUCT_ID,
          name: 'Unrelated Figure',
          slug: 'unrelated-figure',
        }),
      );
    });

    renderWithProviders(
      <CheckoutSuccessEffects
        sessionId="cs_test_123"
        order={createOrder('paid', [createOrderItem(VALID_PRODUCT_ID, 1)])}
      />,
    );

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1);
    });
    expect(useCartStore.getState().items[0]?.product.id).toBe(OTHER_PRODUCT_ID);
    expect(useWishlistStore.getState().items).toEqual([
      expect.objectContaining({ id: OTHER_PRODUCT_ID }),
    ]);
    expect(getPersistedCartItems()).toEqual([
      expect.objectContaining({
        product: expect.objectContaining({ id: OTHER_PRODUCT_ID }),
        quantity: 1,
      }),
    ]);
    expect(getPersistedWishlistItems()).toEqual([
      expect.objectContaining({ id: OTHER_PRODUCT_ID }),
    ]);
  });

  it('removes purchased cart products even when local quantity is higher than the order', async () => {
    act(() => {
      useCartStore.getState().addItem(createCartItem().product, 3);
    });

    renderWithProviders(
      <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder('paid')} />,
    );

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(getPersistedCartItems()).toHaveLength(0);
  });

  it('cleans local cart and wishlist even when checkout access bootstrap fails', async () => {
    vi.mocked(QueryConfigs.fetchCheckoutSuccess).mockRejectedValueOnce(new Error('bootstrap failed'));

    act(() => {
      useCartStore.getState().addItem(createCartItem().product);
      useWishlistStore.getState().addWishlistItem(createWishlistItem());
    });

    renderWithProviders(
      <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder('paid')} />,
    );

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(QueryConfigs.fetchCheckoutSuccess).toHaveBeenCalledWith('cs_test_123');
    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(getPersistedCartItems()).toHaveLength(0);
    expect(getPersistedWishlistItems()).toHaveLength(0);
  });

  it.each<IOrderStatus>(['paid_needs_attention', 'packed', 'shipped'])(
    'removes purchased cart items for finalized %s orders',
    async (status) => {
      act(() => {
        useCartStore.getState().addItem(createCartItem().product);
      });

      renderWithProviders(
        <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder(status)} />,
      );

      await waitFor(() => {
        expect(useCartStore.getState().items).toHaveLength(0);
      });
    },
  );

  it.each<IOrderStatus>(['pending_payment', 'cancelled', 'refunded', 'expired'])(
    'does not modify cart or wishlist for non-finalized %s orders',
    async (status) => {
      act(() => {
        useCartStore.getState().addItem(createCartItem().product);
        useWishlistStore.getState().addWishlistItem(createWishlistItem());
      });

      renderWithProviders(
        <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder(status)} />,
      );

      await waitFor(() => {
        expect(QueryConfigs.fetchCheckoutSuccess).toHaveBeenCalledWith('cs_test_123');
      });
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().items).toHaveLength(1);
      expect(getPersistedCartItems()).toHaveLength(1);
      expect(getPersistedWishlistItems()).toHaveLength(1);
    },
  );

  it('ends a stale checkout lock before removing purchased cart items', async () => {
    act(() => {
      useCartStore.getState().addItem(createCartItem().product);
      useCheckoutUiStore.getState().beginCheckout();
    });

    renderWithProviders(
      <CheckoutSuccessEffects sessionId="cs_test_123" order={createOrder('paid')} />,
    );

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(false);
  });

  it('runs targeted cleanup only once for the same successful order effect', async () => {
    const originalRemovePurchasedProductIds = useCartStore.getState().removePurchasedProductIds;
    const removePurchasedProductIds = vi.fn(originalRemovePurchasedProductIds);

    act(() => {
      useCartStore.setState({ removePurchasedProductIds });
      useCartStore.getState().addItem(createCartItem().product);
    });

    try {
      renderWithProviders(<CheckoutSuccessEffectsHarness initialOrder={createOrder('paid')} />);

      await waitFor(() => {
        expect(removePurchasedProductIds).toHaveBeenCalledTimes(1);
      });

      await userEvent.click(screen.getByRole('button', { name: 'Refresh order' }));

      await waitFor(() => {
        expect(removePurchasedProductIds).toHaveBeenCalledTimes(1);
      });
    } finally {
      act(() => {
        useCartStore.setState({ removePurchasedProductIds: originalRemovePurchasedProductIds });
      });
    }
  });
});
