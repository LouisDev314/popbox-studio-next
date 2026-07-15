import axios from 'axios';
import { notFound } from 'next/navigation';
import { AccountAccessError } from '@/components/account/account-access-error';
import { OrderDetail } from '@/components/account/order-detail';
import { getAccountOrderServer } from '@/lib/api/account-server';
import { requireCustomerAccess } from '@/lib/auth/customer-session';

export default async function OrderDetailPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const currentPath = `/account/orders/${encodeURIComponent(publicId)}`;
  const access = await requireCustomerAccess(currentPath);
  if (access.status !== 'customer') return <AccountAccessError type={access.status} />;

  const order = await getAccountOrderServer(access.accessToken, publicId).catch((error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 404) notFound();
    return null;
  });

  if (!order) {
    return <AccountAccessError type="unavailable" />;
  }

  return <OrderDetail order={order} />;
}
