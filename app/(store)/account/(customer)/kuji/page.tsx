import { AccountAccessError } from '@/components/account/account-access-error';
import { KujiHistory } from '@/components/account/kuji-history';
import { getKujiHistoryServer } from '@/lib/api/account-server';
import { requireCustomerAccess } from '@/lib/auth/customer-session';

export default async function KujiPage() {
  const access = await requireCustomerAccess('/account/kuji');
  if (access.status !== 'customer') return <AccountAccessError type={access.status} />;

  const initialPage = await getKujiHistoryServer(access.accessToken).catch(() => null);

  if (!initialPage) {
    return <AccountAccessError type="unavailable" />;
  }

  return <div><h1 className="mb-8 text-3xl font-semibold tracking-tight">Kuji History</h1><KujiHistory initialPage={initialPage} /></div>;
}
