import type {
  IAdminOrderIdentity,
  IAdminOrderRefundRequest,
  IAdminOrderShipmentUpdate,
  IShipment,
} from '@/interfaces/order';
import { toNullableText } from '@/utils/admin';

export const buildAdminOrderPath = (adminOrderId: string) => `/admin/orders/${adminOrderId}`;

export const getAdminOrderId = (order: Pick<IAdminOrderIdentity, 'id' | 'publicId'>) => {
  const adminOrderId = order.id?.trim();

  if (!adminOrderId) {
    throw new Error(`Missing internal admin order id for order ${order.publicId}`);
  }

  return adminOrderId;
};

export interface IShipmentFormValues {
  carrierName: string;
  trackingNumber: string;
  trackingUrl: string;
}

export function normalizeTrackingUrl(value: string | null | undefined): string | null {
  const normalizedValue = typeof value === 'string' ? toNullableText(value) : null;

  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedValue);

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function buildShipmentUpdatePayload(
  shipmentForm: IShipmentFormValues,
  shipment: IShipment | null,
): IAdminOrderShipmentUpdate {
  const nextCarrierName = toNullableText(shipmentForm.carrierName);
  const nextTrackingNumber = toNullableText(shipmentForm.trackingNumber);
  const nextTrackingUrl = normalizeTrackingUrl(shipmentForm.trackingUrl);
  const currentTrackingUrl = normalizeTrackingUrl(shipment?.trackingUrl);
  const payload: IAdminOrderShipmentUpdate = {};

  if (nextCarrierName !== (shipment?.carrierName ?? null)) {
    payload.carrierName = nextCarrierName;
  }

  if (nextTrackingNumber !== (shipment?.trackingNumber ?? null)) {
    payload.trackingNumber = nextTrackingNumber;
  }

  if (nextTrackingUrl !== currentTrackingUrl) {
    payload.trackingUrl = nextTrackingUrl;
  }

  return payload;
}

export function buildRefundPayload(refundReason: string): IAdminOrderRefundRequest {
  const normalizedReason = toNullableText(refundReason);

  return normalizedReason ? { reason: normalizedReason } : {};
}
