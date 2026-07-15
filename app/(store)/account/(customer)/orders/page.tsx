import { AccountAccessError } from '@/components/account/account-access-error';
import { OrdersList } from '@/components/account/orders-list';
import { getAccountOrdersServer } from '@/lib/api/account-server';
import { requireCustomerAccess } from '@/lib/auth/customer-session';

export default async function OrdersPage() {
  const access = await requireCustomerAccess('/account/orders');
  if (access.status !== 'customer') return <AccountAccessError type={access.status} />;

  const initialPage = await getAccountOrdersServer(access.accessToken).catch(() => null);

  if (!initialPage) {
    return <AccountAccessError type="unavailable" />;
  }

  return <div><h1 className="mb-8 text-3xl font-semibold tracking-tight">Orders</h1><OrdersList initialPage={initialPage} /></div>;
}
