import type { IAdminOrderIdentity } from '@/interfaces/order';

export const buildAdminOrderPath = (adminOrderId: string) => `/admin/orders/${adminOrderId}`;

export const getAdminOrderId = (order: Pick<IAdminOrderIdentity, 'id' | 'publicId'>) => {
  const adminOrderId = order.id?.trim();

  if (!adminOrderId) {
    throw new Error(`Missing internal admin order id for order ${order.publicId}`);
  }

  return adminOrderId;
};
