'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AxiosError, HttpStatusCode } from 'axios';
import { ArrowLeft, Mail, Package, Truck, XCircle, CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  IOrderDetail,
  IOrderStatus,
  IShipment,
} from '@/interfaces/order';
import LastOnePrizeBadge from '@/components/admin/orders/last-one-prize-badge';
import {
  buildRefundPayload,
  buildShipmentUpdatePayload,
  getAdminOrderId,
  normalizeTrackingUrl,
  type IShipmentFormValues,
} from '@/utils/admin-order';

const STATUS_CONFIG: Record<IOrderStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-accent', text: 'text-foreground' },
  paid: { label: 'Paid', bg: 'bg-primary/10', text: 'text-primary' },
  packed: { label: 'Packed', bg: 'bg-muted', text: 'text-foreground' },
  shipped: { label: 'Shipped', bg: 'border border-border/60 bg-card', text: 'text-foreground' },
  cancelled: { label: 'Cancelled', bg: 'bg-muted', text: 'text-muted-foreground' },
  refunded: { label: 'Refunded', bg: 'bg-muted', text: 'text-muted-foreground' },
  paid_needs_attention: { label: 'Needs Attention', bg: 'bg-primary/15', text: 'text-primary' },
  expired: { label: 'Expired', bg: 'bg-muted', text: 'text-muted-foreground' },
};

type ShipmentActionMode = 'ship' | 'edit';

function createShipmentForm(shipment: IShipment | null): IShipmentFormValues {
  return {
    carrierName: shipment?.carrierName || '',
    trackingNumber: shipment?.trackingNumber || '',
    trackingUrl: normalizeTrackingUrl(shipment?.trackingUrl) ?? shipment?.trackingUrl ?? '',
  };
}

function StatusBadge({ status }: { status: IOrderStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-muted', text: 'text-foreground' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

type OrderActionFeedback = {
  type: 'error' | 'info' | 'success';
  message: string;
};

function getResendConfirmationErrorMessage(error: AxiosError<IBaseApiResponse>): string {
  const responseStatus = error.response?.status;
  const responseMessage = error.response?.data?.message?.trim();

  if (responseMessage) {
    return responseMessage;
  }

  switch (responseStatus) {
    case HttpStatusCode.NotFound:
      return 'Order not found.';
    case HttpStatusCode.Conflict:
      return 'This order is not eligible for a confirmation email resend.';
    case HttpStatusCode.UnprocessableEntity:
      return 'This order is missing a valid customer email address.';
    case HttpStatusCode.BadGateway:
    case HttpStatusCode.ServiceUnavailable:
      return 'Email delivery is temporarily unavailable. Please try again shortly.';
    default:
      return 'Failed to resend the confirmation email.';
  }
}

function getAdminOrderActionErrorMessage(
  error: AxiosError<IBaseApiResponse>,
  fallbackMessage: string,
): string {
  return error.response?.data?.message?.trim() || fallbackMessage;
}

function getAdminOrderActionSuccessMessage(
  response: IBaseApiResponse,
  fallbackMessage: string,
): string {
  return response.message?.trim() || fallbackMessage;
}

function OrderActionFeedbackBanner({ feedback }: { feedback: OrderActionFeedback }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        feedback.type === 'success'
          ? 'border-primary/20 bg-primary/10 text-foreground'
          : feedback.type === 'info'
            ? 'border-border/40 bg-muted/50 text-foreground'
            : 'border-primary/20 bg-accent text-foreground'
      }`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      {feedback.message}
    </div>
  );
}

interface IOrderActionButtonsProps {
  order: IOrderDetail;
  isStatusUpdating: boolean;
  isShipmentUpdating: boolean;
  isRefunding: boolean;
  isResendingConfirmation: boolean;
  onUpdateStatus: (newStatus: IOrderStatus) => void;
  onOpenRefund: () => void;
  onOpenShipment: () => void;
  onResendConfirmation: () => void;
}

function OrderActionButtons({
  order,
  isStatusUpdating,
  isShipmentUpdating,
  isRefunding,
  isResendingConfirmation,
  onUpdateStatus,
  onOpenRefund,
  onOpenShipment,
  onResendConfirmation,
}: IOrderActionButtonsProps) {
  const canRefund = order.status === 'paid' || order.status === 'packed' || order.status === 'shipped' || order.status === 'paid_needs_attention';
  const shipmentActionMode: ShipmentActionMode | null = order.status === 'packed'
    ? 'ship'
    : order.status === 'shipped'
      ? 'edit'
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.status === 'pending_payment' && (
        <Button
          type="button"
          onClick={() => onUpdateStatus('cancelled')}
          disabled={isStatusUpdating}
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      )}

      {(order.status === 'paid' || order.status === 'paid_needs_attention') && (
        <Button
          type="button"
          onClick={() => onUpdateStatus('packed')}
          disabled={isStatusUpdating}
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <Package className="h-4 w-4" />
          Mark Packed
        </Button>
      )}

      {canRefund && (
        <Button
          type="button"
          onClick={onOpenRefund}
          disabled={isRefunding}
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-border bg-card text-foreground hover:bg-muted"
        >
          <CreditCard className="h-4 w-4" />
          Refund
        </Button>
      )}

      <Button
        type="button"
        onClick={onResendConfirmation}
        disabled={isResendingConfirmation}
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-lg border-border bg-card text-foreground hover:bg-muted"
      >
        <Mail className="h-4 w-4" />
        {isResendingConfirmation ? 'Resending...' : 'Resend confirmation email'}
      </Button>

      {shipmentActionMode ? (
        <Button
          type="button"
          onClick={onOpenShipment}
          disabled={isShipmentUpdating}
          variant={shipmentActionMode === 'ship' ? 'default' : 'outline'}
          size="sm"
          className={shipmentActionMode === 'ship'
            ? 'gap-1.5 rounded-lg px-4'
            : 'gap-1.5 rounded-lg border-border bg-card px-4 text-foreground hover:bg-muted'}
        >
          <Truck className="h-4 w-4" />
          {shipmentActionMode === 'ship' ? 'Ship Order' : 'Edit Shipment'}
        </Button>
      ) : null}
    </div>
  );
}

function OrderItemImage({
  imageUrl,
  altText,
  productName,
}: {
  imageUrl: string | null;
  altText: string | null;
  productName: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted text-xs font-semibold text-muted-foreground">
        No Img
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={altText || productName}
      width={64}
      height={64}
      className="h-16 w-16 shrink-0 rounded-lg border border-border/50 bg-muted object-cover"
    />
  );
}

function OrderItemsSection({ order }: { order: IOrderDetail }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm">
      <div className="border-b border-border/30 bg-muted/30 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Order Items ({order.items.length})</h2>
      </div>
      <div className="divide-y divide-border/30">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 p-6">
            <OrderItemImage
              imageUrl={item.imageUrl}
              altText={item.imageAltText}
              productName={item.productName}
            />
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between">
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="font-medium text-foreground">{formatPrice(item.lineTotalCents, order.currency)}</p>
              </div>
              <p className="mt-1 text-sm capitalize text-muted-foreground">{item.productType} Product</p>
              <div className="mt-auto flex justify-between text-sm">
                <p className="text-muted-foreground">{formatPrice(item.unitPriceCents, order.currency)}</p>
                <p className="font-medium text-muted-foreground">Qty: {item.quantity}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-border/30 bg-muted/30 p-6 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <p>Subtotal</p>
          <p>{formatPrice(order.subtotalCents, order.currency)}</p>
        </div>
        <div className="flex justify-between">
          <p>Shipping</p>
          <p>{formatPrice(order.shippingCents, order.currency)}</p>
        </div>
        <div className="flex justify-between">
          <p>Tax</p>
          <p>{formatPrice(order.taxCents, order.currency)}</p>
        </div>
        <div className="flex justify-between border-t border-border/30 pt-2 text-base font-semibold text-foreground">
          <p>Total</p>
          <p>{formatPrice(order.totalCents, order.currency)}</p>
        </div>
      </div>
    </div>
  );
}

function OrderTicketsSection({ order }: { order: IOrderDetail }) {
  if (!order.tickets?.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm">
      <div className="border-b border-border/30 bg-muted/30 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Kuji Tickets ({order.tickets.length})</h2>
      </div>
      <div className="divide-y divide-border/30">
        {order.tickets.map((ticket) => (
          <div key={ticket.id} className="flex items-center justify-between p-4 px-6 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium text-muted-foreground">#{ticket.ticketNumber}</span>
              <span className="text-foreground">{ticket.kujiProduct.name}</span>
            </div>
            <div className="text-right">
              {ticket.prize ? (
                <span className="font-semibold text-primary">Prize {ticket.prize.prizeCode}: {ticket.prize.name}</span>
              ) : ticket.voidedAt ? (
                <span className="text-red-500">Voided</span>
              ) : (
                <span className="italic text-muted-foreground">Unrevealed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderSidebar({
  order,
}: {
  order: IOrderDetail;
}) {
  const normalizedTrackingUrl = normalizeTrackingUrl(order.shipment?.trackingUrl);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h2>
        <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <a href={`mailto:${order.customer.email}`} className="text-primary hover:underline">{order.customer.email}</a>
        </p>
        {order.customer.phone && <p className="mt-0.5 text-sm text-muted-foreground">{order.customer.phone}</p>}
      </div>

      <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping Address</h2>
        {order.shippingAddress ? (
          <div className="space-y-0.5 text-sm text-foreground">
            <p>{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state ?? order.shippingAddress.province}, {order.shippingAddress.postalCode}</p>
            <p className="mt-1 uppercase text-muted-foreground/80">{order.shippingAddress.countryCode}</p>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No physical address required.</p>
        )}
      </div>

      <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipment Details</h2>
        {order.shipment?.carrierName && order.shipment?.trackingNumber ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">Carrier</span>
              <span className="font-medium text-foreground">{order.shipment.carrierName}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Tracking Number</span>
              {normalizedTrackingUrl ? (
                <a href={normalizedTrackingUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{order.shipment.trackingNumber}</a>
              ) : (
                <span className="font-medium text-foreground">{order.shipment.trackingNumber}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">Not shipped yet.</p>
        )}
      </div>
    </div>
  );
}

interface IShipmentDialogProps {
  isOpen: boolean;
  mode: ShipmentActionMode;
  shipmentForm: IShipmentFormValues;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onShipmentFormChange: (form: IShipmentFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function ShipmentDialog({
  isOpen,
  mode,
  shipmentForm,
  isPending,
  onOpenChange,
  onShipmentFormChange,
  onSubmit,
}: IShipmentDialogProps) {
  const title = mode === 'ship' ? 'Ship Order' : 'Edit Shipment';
  const submitLabel = mode === 'ship' ? 'Ship Order' : 'Save Shipment';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border/50 bg-card p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Carrier</label>
            <Input
              placeholder="e.g. UPS, FedEx, Canada Post"
              value={shipmentForm.carrierName}
              onChange={(e) => onShipmentFormChange({ ...shipmentForm, carrierName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tracking Number</label>
            <Input
              placeholder="e.g. 1Z9999999999999999"
              value={shipmentForm.trackingNumber}
              onChange={(e) => onShipmentFormChange({ ...shipmentForm, trackingNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tracking URL (Optional)</label>
            <Input
              placeholder="https://..."
              value={shipmentForm.trackingUrl}
              onChange={(e) => onShipmentFormChange({ ...shipmentForm, trackingUrl: e.target.value })}
            />
          </div>
          <DialogFooter className="mt-6 gap-2 border-t border-border/20 pt-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="secondary"
              className="rounded-lg text-muted-foreground"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-lg"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface IRefundDialogProps {
  isOpen: boolean;
  refundReason: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onRefundReasonChange: (reason: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function RefundDialog({
  isOpen,
  refundReason,
  isPending,
  onOpenChange,
  onRefundReasonChange,
  onSubmit,
}: IRefundDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border/50 bg-card p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-foreground">Refund Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">This will refund the full order amount through the payment gateway and void any active Kuji tickets.</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Reason for refund</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={refundReason}
              onChange={(e) => onRefundReasonChange(e.target.value)}
            >
              <option value="Customer Request">Customer Request</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Fraudulent">Fraudulent</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <DialogFooter className="mt-6 gap-2 border-t border-border/20 pt-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="secondary"
              className="rounded-lg text-muted-foreground"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="rounded-lg"
            >
              Process Refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrderDetailPageClient({ adminOrderId }: { adminOrderId: string }) {
  const queryClient = useQueryClient();
  const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState<IShipmentFormValues>(createShipmentForm(null));
  const [refundReason, setRefundReason] = useState('Customer Request');
  const [actionFeedback, setActionFeedback] = useState<OrderActionFeedback | null>(null);

  const { data: fetchRes, isPending } = useCustomizeQuery<IOrderDetail>({
    queryKey: ['admin', 'orders', adminOrderId],
    queryFn: () => QueryConfigs.fetchAdminOrder(adminOrderId),
  });

  const order = fetchRes?.data?.data;
  const shipmentActionMode: ShipmentActionMode = order?.status === 'packed' ? 'ship' : 'edit';

  const refreshOrderQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'], exact: true }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', adminOrderId], exact: true }),
    ]);
  };

  const resolveAdminOrderId = () => {
    if (!order) {
      setActionFeedback({
        type: 'error',
        message: 'Unable to run the admin action because the order details are unavailable.',
      });
      return null;
    }

    try {
      return getAdminOrderId(order);
    } catch {
      setActionFeedback({
        type: 'error',
        message: 'Unable to run the admin action because the internal order id is missing.',
      });
      return null;
    }
  };

  const { mutation: updateStatus, isPending: isStatusUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminOrderStatus,
    onSuccess: async (response) => {
      await refreshOrderQueries();
      setActionFeedback({
        type: 'success',
        message: getAdminOrderActionSuccessMessage(response.data, 'Order status updated.'),
      });
    },
    onError: (error) => {
      setActionFeedback({
        type: 'error',
        message: getAdminOrderActionErrorMessage(error, 'Failed to update order status.'),
      });
    },
  });

  const { mutation: updateShipment, isPending: isShipmentUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminOrderShipment,
    onSuccess: async (response) => {
      await refreshOrderQueries();
      setIsShipmentDialogOpen(false);
      setActionFeedback({
        type: 'success',
        message: getAdminOrderActionSuccessMessage(
          response.data,
          shipmentActionMode === 'ship' ? 'Order shipped.' : 'Shipment updated.',
        ),
      });
    },
    onError: (error) => {
      setActionFeedback({
        type: 'error',
        message: getAdminOrderActionErrorMessage(error, 'Failed to update shipment.'),
      });
    },
  });

  const { mutation: processRefund, isPending: isRefunding } = useCustomizeMutation({
    mutationFn: MutationConfigs.refundAdminOrder,
    onSuccess: async (response) => {
      await refreshOrderQueries();
      setIsRefundDialogOpen(false);
      setActionFeedback({
        type: 'success',
        message: getAdminOrderActionSuccessMessage(response.data, 'Order refunded.'),
      });
    },
    onError: (error) => {
      setActionFeedback({
        type: 'error',
        message: getAdminOrderActionErrorMessage(error, 'Failed to refund the order.'),
      });
    },
  });

  const { mutation: resendConfirmation, isPending: isResendingConfirmation } = useCustomizeMutation<void, string>({
    mutationFn: MutationConfigs.resendAdminOrderConfirmation,
    onSuccess: (response) => {
      setActionFeedback({
        type: 'success',
        message: response.data.message || 'Confirmation email sent successfully.',
      });
    },
    onError: (error) => {
      setActionFeedback({
        type: 'error',
        message: getResendConfirmationErrorMessage(error),
      });
    },
  });

  if (isPending) return <div className="p-12 text-center text-muted-foreground">Loading order details...</div>;
  if (!order) return <div className="p-12 text-center text-red-500">Failed to load order.</div>;

  const handleUpdateStatus = (newStatus: IOrderStatus) => {
    setActionFeedback(null);
    const nextAdminOrderId = resolveAdminOrderId();

    if (!nextAdminOrderId) {
      return;
    }

    updateStatus({ adminOrderId: nextAdminOrderId, data: { status: newStatus } });
  };

  const handleOpenShipment = () => {
    setShipmentForm(createShipmentForm(order.shipment));
    setIsShipmentDialogOpen(true);
  };

  const handleShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    const nextAdminOrderId = resolveAdminOrderId();

    if (!nextAdminOrderId) {
      return;
    }

    const shipmentPayload = buildShipmentUpdatePayload(shipmentForm, order.shipment);

    if (Object.keys(shipmentPayload).length === 0) {
      setActionFeedback({
        type: 'info',
        message: 'No shipment changes to save.',
      });
      return;
    }

    updateShipment({
      adminOrderId: nextAdminOrderId,
      data: shipmentPayload,
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    const nextAdminOrderId = resolveAdminOrderId();

    if (!nextAdminOrderId) {
      return;
    }

    processRefund({ adminOrderId: nextAdminOrderId, data: buildRefundPayload(refundReason) });
  };

  const handleResendConfirmation = () => {
    setActionFeedback(null);
    const nextAdminOrderId = resolveAdminOrderId();

    if (!nextAdminOrderId) {
      return;
    }

    resendConfirmation(nextAdminOrderId);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground transition-colors hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order #{order.publicId}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}</p>
          </div>
        </div>

        <div className="flex max-w-full flex-col items-stretch gap-3 sm:items-end">
          <OrderActionButtons
            order={order}
            isStatusUpdating={isStatusUpdating}
            isShipmentUpdating={isShipmentUpdating}
            isRefunding={isRefunding}
            isResendingConfirmation={isResendingConfirmation}
            onUpdateStatus={handleUpdateStatus}
            onOpenRefund={() => setIsRefundDialogOpen(true)}
            onOpenShipment={handleOpenShipment}
            onResendConfirmation={handleResendConfirmation}
          />
          {actionFeedback ? <OrderActionFeedbackBanner feedback={actionFeedback} /> : null}
        </div>
      </div>

      {order.includesLastOnePrize ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
          <LastOnePrizeBadge className="mt-0.5 shrink-0" />
          <p className="font-medium">This order includes the Last One (LO) prize.</p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <OrderItemsSection order={order} />
          <OrderTicketsSection order={order} />
        </div>

        <OrderSidebar order={order} />
      </div>

      <ShipmentDialog
        isOpen={isShipmentDialogOpen}
        mode={shipmentActionMode}
        shipmentForm={shipmentForm}
        isPending={isShipmentUpdating}
        onOpenChange={setIsShipmentDialogOpen}
        onShipmentFormChange={setShipmentForm}
        onSubmit={handleShipmentSubmit}
      />

      <RefundDialog
        isOpen={isRefundDialogOpen}
        refundReason={refundReason}
        isPending={isRefunding}
        onOpenChange={setIsRefundDialogOpen}
        onRefundReasonChange={setRefundReason}
        onSubmit={handleRefundSubmit}
      />
    </div>
  );
}
