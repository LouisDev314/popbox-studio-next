import { screen } from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrderDetailPageClient from '@/components/admin/orders/admin-order-detail-page';
import QueryConfigs from '@/configs/api/query-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IOrderDetail } from '@/interfaces/order';
import { renderWithProviders } from '../test-utils';

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

function createOrder(overrides: Partial<IOrderDetail> = {}): IOrderDetail {
  return {
    id: 'order-1',
    publicId: 'PBX-1001',
    status: 'paid',
    attention: null,
    currency: 'CAD',
    subtotalCents: 4999,
    taxCents: 0,
    shippingCents: 0,
    totalCents: 4999,
    placedAt: '2026-04-01T10:00:00.000Z',
    paidAt: '2026-04-01T10:01:00.000Z',
    cancelledAt: null,
    refundedAt: null,
    shippingAddress: {
      city: 'Toronto',
      countryCode: 'CA',
      fullName: 'Alex Chen',
      line1: '123 Queen St',
      line2: '',
      name: 'Alex Chen',
      postalCode: 'M5H 2N2',
      province: 'ON',
    },
    billingAddress: null,
    customer: {
      id: 'customer-1',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Chen',
      phone: null,
    },
    shipment: null,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Ichiban Figure',
        productType: 'standard',
        unitPriceCents: 4999,
        quantity: 1,
        lineTotalCents: 4999,
        metadata: null,
        imageUrl: null,
        imageAltText: null,
      },
    ],
    tickets: [],
    ...overrides,
  };
}

describe('AdminOrderDetailPageClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders backend-provided paid order attention details', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(
      createResponse(createOrder({
        status: 'paid_needs_attention',
        attention: {
          reasonCode: 'kuji_ticket_reveal_failed',
          message: 'Backend says ticket assignment needs review.',
          actionHint: 'Open the order and inspect the ticket draw.',
          createdAt: '2026-04-01T10:30:00.000Z',
        },
      })),
    );

    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    expect(await screen.findByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    expect(screen.getByText('Backend says ticket assignment needs review.')).toBeInTheDocument();
    expect(screen.getByText('Open the order and inspect the ticket draw.')).toBeInTheDocument();
    expect(screen.getByText('kuji_ticket_reveal_failed')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-04-01T10:30:00.000Z').toLocaleString())).toBeInTheDocument();
  });

  it('does not render the attention section when attention is absent', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(
      createResponse(createOrder({
        status: 'paid_needs_attention',
        attention: null,
      })),
    );

    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await screen.findByRole('heading', { name: 'Order #PBX-1001' });
    expect(screen.queryByRole('heading', { name: 'Needs attention' })).not.toBeInTheDocument();
  });
});
