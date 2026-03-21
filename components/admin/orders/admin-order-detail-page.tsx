'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Truck, XCircle, CreditCard, RotateCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { IOrderDetail, IOrderStatus } from '@/interfaces/order';

const STATUS_CONFIG: Record<IOrderStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' },
  packed: { label: 'Packed', bg: 'bg-blue-100', text: 'text-blue-800' },
  shipped: { label: 'Shipped', bg: 'bg-purple-100', text: 'text-purple-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
  refunded: { label: 'Refunded', bg: 'bg-gray-100', text: 'text-gray-800' },
  paid_needs_attention: { label: 'Needs Attention', bg: 'bg-orange-100', text: 'text-orange-800' },
  expired: { label: 'Expired', bg: 'bg-gray-100', text: 'text-gray-500' },
};

function StatusBadge({ status }: { status: IOrderStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function AdminOrderDetailPageClient({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({ carrierName: '', trackingNumber: '', trackingUrl: '' });
  const [refundReason, setRefundReason] = useState('Customer Request');

  const { data: fetchRes, isPending } = useCustomizeQuery<IOrderDetail>({
    queryKey: ['admin', 'orders', orderId],
    queryFn: () => QueryConfigs.fetchAdminOrder(orderId),
  });

  const order = fetchRes?.data?.data;

  const invalidateOrder = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  const { mutation: updateStatus, isPending: isStatusUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminOrderStatus,
    onSuccess: invalidateOrder,
  });

  const { mutation: updateShipment, isPending: isShipmentUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminOrderShipment,
    onSuccess: () => {
      invalidateOrder();
      setIsShipmentDialogOpen(false);
    },
  });

  const { mutation: processRefund, isPending: isRefunding } = useCustomizeMutation({
    mutationFn: MutationConfigs.refundAdminOrder,
    onSuccess: () => {
      invalidateOrder();
      setIsRefundDialogOpen(false);
    },
  });

  const { mutation: processReconcile, isPending: isReconciling } = useCustomizeMutation({
    mutationFn: MutationConfigs.reconcileAdminOrderRefund,
    onSuccess: invalidateOrder,
  });

  if (isPending) return <div className="p-12 text-center text-[#514349]">Loading order details...</div>;
  if (!order) return <div className="p-12 text-center text-red-500">Failed to load order.</div>;

  const customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || 'Guest User';

  const handleUpdateStatus = (newStatus: IOrderStatus) => {
    updateStatus({ orderId: order.publicId, data: { status: newStatus } });
  };

  const handleShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateShipment({
      orderId: order.publicId,
      data: {
        carrierName: shipmentForm.carrierName || null,
        trackingNumber: shipmentForm.trackingNumber || null,
        trackingUrl: shipmentForm.trackingUrl || null,
      },
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processRefund({ orderId: order.publicId, data: { reason: refundReason } });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D5C1C9]/50 bg-white text-[#514349] transition-colors hover:bg-[#F2F4F6]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Order #{order.publicId}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-[#514349]">{order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'pending_payment' && (
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={isStatusUpdating}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          )}

          {(order.status === 'paid' || order.status === 'paid_needs_attention') && (
            <button
              onClick={() => handleUpdateStatus('packed')}
              disabled={isStatusUpdating}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Package className="h-4 w-4" /> Mark Packed
            </button>
          )}

          {order.status === 'packed' && (
            <button
              onClick={() => handleUpdateStatus('shipped')}
              disabled={isStatusUpdating}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <Truck className="h-4 w-4" /> Mark Shipped
            </button>
          )}

          {(order.status === 'paid' || order.status === 'packed' || order.status === 'shipped' || order.status === 'paid_needs_attention') && (
            <button
              onClick={() => setIsRefundDialogOpen(true)}
              disabled={isRefunding}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D5C1C9] bg-white px-3 text-sm font-medium text-[#191C1E] hover:bg-[#F2F4F6] disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" /> Refund
            </button>
          )}

          {(order.status === 'refunded' || order.status === 'cancelled') && order.refundedAt && !order.cancelledAt && (
            <button
              onClick={() => processReconcile(order.publicId)}
              disabled={isReconciling}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D5C1C9] bg-[#E6E8EA] px-3 text-sm font-medium text-[#191C1E] hover:bg-[#D5C1C9] disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" /> Reconcile Refund
            </button>
          )}

          <button
            onClick={() => {
              setShipmentForm({
                carrierName: order.shipment?.carrierName || '',
                trackingNumber: order.shipment?.trackingNumber || '',
                trackingUrl: order.shipment?.trackingUrl || '',
              });
              setIsShipmentDialogOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#8A486F] to-[#F9A8D4] px-4 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
          >
             Update Shipment
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Order Items */}
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-[#D5C1C9]/30 bg-[#F9FAFB] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Order Items ({order.items.length})</h2>
            </div>
            <div className="divide-y divide-[#D5C1C9]/30">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-6">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.imageAltText || item.productName} className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#F2F4F6] border border-[#D5C1C9]/50" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#E6E8EA] text-xs font-semibold text-[#514349]">No Img</div>
                  )}
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between">
                      <p className="font-medium text-[#191C1E]">{item.productName}</p>
                      <p className="font-medium text-[#191C1E]">{formatPrice(item.lineTotalCents, order.currency)}</p>
                    </div>
                    <p className="mt-1 text-sm text-[#514349] capitalize">{item.productType} Product</p>
                    <div className="mt-auto flex justify-between text-sm">
                      <p className="text-[#514349]">{formatPrice(item.unitPriceCents, order.currency)}</p>
                      <p className="font-medium text-[#514349]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#D5C1C9]/30 bg-[#F9FAFB] p-6 space-y-2 text-sm text-[#514349]">
              <div className="flex justify-between"><p>Subtotal</p><p>{formatPrice(order.subtotalCents, order.currency)}</p></div>
              <div className="flex justify-between"><p>Shipping</p><p>{formatPrice(order.shippingCents, order.currency)}</p></div>
              <div className="flex justify-between"><p>Tax</p><p>{formatPrice(order.taxCents, order.currency)}</p></div>
              <div className="flex justify-between border-t border-[#D5C1C9]/30 pt-2 text-base font-semibold text-[#191C1E]">
                <p>Total</p><p>{formatPrice(order.totalCents, order.currency)}</p>
              </div>
            </div>
          </div>

          {/* Tickets (If any) */}
          {order.tickets?.length > 0 && (
            <div className="rounded-xl border border-[#D5C1C9]/30 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-[#D5C1C9]/30 bg-[#F9FAFB] px-6 py-4">
                <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Kuji Tickets ({order.tickets.length})</h2>
              </div>
              <div className="divide-y divide-[#D5C1C9]/30">
                {order.tickets.map((ticket) => (
                  <div key={ticket.id} className="flex justify-between items-center p-4 px-6 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-[#514349]">#{ticket.ticketNumber}</span>
                      <span className="text-[#191C1E]">{ticket.kujiProduct.name}</span>
                    </div>
                    <div className="text-right">
                      {ticket.prize ? (
                        <span className="font-semibold text-primary">Prize {ticket.prize.prizeCode}: {ticket.prize.name}</span>
                      ) : ticket.voidedAt ? (
                        <span className="text-red-500">Voided</span>
                      ) : (
                        <span className="text-[#514349] italic">Unrevealed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold text-[#514349] uppercase tracking-wider">Customer</h2>
            <p className="font-medium text-[#191C1E]">{customerName}</p>
            <p className="text-sm text-[#514349] mt-0.5"><a href={`mailto:${order.customer.email}`} className="text-primary hover:underline">{order.customer.email}</a></p>
            {order.customer.phone && <p className="text-sm text-[#514349] mt-0.5">{order.customer.phone}</p>}
          </div>

          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold text-[#514349] uppercase tracking-wider">Shipping Address</h2>
            {order.shippingAddress ? (
              <div className="text-sm text-[#191C1E] space-y-0.5">
                <p>{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}</p>
                <p className="uppercase text-[#514349]/80 mt-1">{order.shippingAddress.country}</p>
              </div>
            ) : (
              <p className="text-sm text-[#514349] italic">No physical address required.</p>
            )}
          </div>

          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold text-[#514349] uppercase tracking-wider">Shipment Details</h2>
            {order.shipment?.carrierName && order.shipment?.trackingNumber ? (
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-[#514349] block text-xs">Carrier</span>
                  <span className="font-medium text-[#191C1E]">{order.shipment.carrierName}</span>
                </div>
                <div>
                  <span className="text-[#514349] block text-xs">Tracking Number</span>
                  {order.shipment.trackingUrl ? (
                    <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{order.shipment.trackingNumber}</a>
                  ) : (
                    <span className="font-medium text-[#191C1E]">{order.shipment.trackingNumber}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#514349] italic">Not shipped yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Shipment Dialog */}
      <Dialog open={isShipmentDialogOpen} onOpenChange={setIsShipmentDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-[#D5C1C9]/50 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl text-[#191C1E] font-semibold">Update Shipment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShipmentSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Carrier</label>
              <Input placeholder="e.g. UPS, FedEx, Canada Post" value={shipmentForm.carrierName} onChange={e => setShipmentForm(f => ({ ...f, carrierName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Tracking Number</label>
              <Input placeholder="e.g. 1Z9999999999999999" value={shipmentForm.trackingNumber} onChange={e => setShipmentForm(f => ({ ...f, trackingNumber: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Tracking URL (Optional)</label>
              <Input placeholder="https://..." value={shipmentForm.trackingUrl} onChange={e => setShipmentForm(f => ({ ...f, trackingUrl: e.target.value }))} />
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-[#D5C1C9]/20 gap-2">
              <button type="button" onClick={() => setIsShipmentDialogOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#514349] hover:bg-[#E6E8EA]" disabled={isShipmentUpdating}>Cancel</button>
              <button type="submit" disabled={isShipmentUpdating} className="rounded-lg bg-[#191C1E] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50">Save Shipment</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-[#D5C1C9]/50 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl text-[#191C1E] font-semibold">Refund Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <p className="text-sm text-[#514349]">This will refund the full order amount through the payment gateway and void any active Kuji tickets.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Reason for refund</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
              >
                <option value="Customer Request">Customer Request</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Fraudulent">Fraudulent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-[#D5C1C9]/20 gap-2">
              <button type="button" onClick={() => setIsRefundDialogOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#514349] hover:bg-[#E6E8EA]" disabled={isRefunding}>Cancel</button>
              <button type="submit" disabled={isRefunding} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Process Refund</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
