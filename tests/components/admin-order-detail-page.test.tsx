import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrderDetailPageClient from '@/components/admin/orders/admin-order-detail-page';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IAdminPaymentRecoveryResponse, IOrderDetail } from '@/interfaces/order';
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

function createOrder(overrides: Partial<IOrderDetail & { customerNote: string | null }> = {}): IOrderDetail & { customerNote: string | null } {
  return {
    id: 'order-1',
    publicId: 'PBX-1001',
    status: 'paid',
    attention: null,
    customerNote: null,
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

function createAttentionOrder() {
  return createOrder({
    status: 'paid_needs_attention',
    attention: {
      reasonCode: 'payment_amount_mismatch',
      message: 'Payment needs authoritative reconciliation.',
      actionHint: 'Review this warning before reconciling the payment.',
      createdAt: '2026-04-01T10:30:00.000Z',
    },
  });
}

function createRecoveryResponse(emailStatus: IAdminPaymentRecoveryResponse['email']['status']) {
  return createResponse<IAdminPaymentRecoveryResponse>({
    order: { id: 'order-1', publicId: 'PBX-1001', status: 'paid' },
    reconciliation: {
      expectedBeforeDiscountCents: 4999,
      discountCents: 0,
      expectedAfterDiscountCents: 4999,
      stripeAmountTotalCents: 4999,
      stripeAmountReceivedCents: 4999,
    },
    finalization: {
      paymentUpdated: true,
      reservationsConverted: true,
      inventoryUpdated: true,
      ticketsCreated: 0,
    },
    email: { status: emailStatus },
  });
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

  it('shows payment reconciliation only for paid_needs_attention orders', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(createResponse(createAttentionOrder()));
    const { unmount } = renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    expect(await screen.findByRole('button', { name: 'Reconcile payment' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark Packed' })).not.toBeInTheDocument();

    unmount();
    vi.mocked(QueryConfigs.fetchAdminOrder).mockResolvedValue(createResponse(createOrder({ status: 'paid' })));
    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);
    await screen.findByRole('heading', { name: 'Order #PBX-1001' });
    expect(screen.queryByRole('button', { name: 'Reconcile payment' })).not.toBeInTheDocument();
  });

  it('requires confirmation before reconciling and disables actions while pending', async () => {
    const user = userEvent.setup();
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(createResponse(createAttentionOrder()));
    let resolveRecovery!: (value: AxiosResponse<IBaseApiResponse<IAdminPaymentRecoveryResponse>>) => void;
    const recoveryPromise = new Promise<AxiosResponse<IBaseApiResponse<IAdminPaymentRecoveryResponse>>>((resolve) => {
      resolveRecovery = resolve;
    });
    const recoverySpy = vi.spyOn(MutationConfigs, 'recoverAdminOrderPayment').mockReturnValue(recoveryPromise);
    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reconcile payment' }));
    expect(recoverySpy).not.toHaveBeenCalled();
    expect(screen.getByText('Review this warning before reconciling the payment.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm reconciliation' }));
    expect(recoverySpy).toHaveBeenCalledWith('order-1', expect.any(Object));
    expect(screen.getByRole('button', { name: 'Reconciling...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolveRecovery(createRecoveryResponse('sent'));
    expect(await screen.findByText('Payment reconciled successfully. Confirmation email sent.')).toBeInTheDocument();
  });

  it('shows backend reconciliation failures without refreshing the order', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(createResponse(createAttentionOrder()));
    vi.spyOn(MutationConfigs, 'recoverAdminOrderPayment').mockRejectedValue(new AxiosError(
      'Conflict',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { ...createResponse(null), status: 409, data: { ...createResponse(null).data, message: 'Stripe payment amount does not match the order.', errors: { code: 'PAYMENT_AMOUNT_MISMATCH' } } },
    ));
    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reconcile payment' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reconciliation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Stripe payment amount does not match the order.');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reports a committed recovery when confirmation email delivery fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(createResponse(createAttentionOrder()));
    vi.spyOn(MutationConfigs, 'recoverAdminOrderPayment').mockResolvedValue(createRecoveryResponse('failed'));
    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reconcile payment' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reconciliation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Payment reconciled successfully, but the confirmation email failed to send.');
  });

  it('refreshes the order detail query after successful recovery', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(createResponse(createAttentionOrder()));
    vi.spyOn(MutationConfigs, 'recoverAdminOrderPayment').mockResolvedValue(createRecoveryResponse('already_sent'));
    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reconcile payment' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reconciliation' }));

    expect(await screen.findByText('Payment reconciled successfully. Confirmation email was already sent.')).toBeInTheDocument();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });

  it('renders the backend-provided customer note when present', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(
      createResponse(createOrder({
        customerNote: 'Please pack this away from heavy items.',
      })),
    );

    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    expect(await screen.findByRole('heading', { name: 'Customer note' })).toBeInTheDocument();
    expect(screen.getByText('Please pack this away from heavy items.')).toBeInTheDocument();
  });

  it('omits the customer note section when no note exists', async () => {
    vi.spyOn(QueryConfigs, 'fetchAdminOrder').mockResolvedValue(
      createResponse(createOrder({
        customerNote: null,
      })),
    );

    renderWithProviders(<AdminOrderDetailPageClient adminOrderId="order-1" />);

    await screen.findByRole('heading', { name: 'Order #PBX-1001' });
    expect(screen.queryByRole('heading', { name: 'Customer note' })).not.toBeInTheDocument();
  });
});
