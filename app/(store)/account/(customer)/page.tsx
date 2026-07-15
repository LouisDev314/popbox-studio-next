import { AccountAccessError } from '@/components/account/account-access-error';
import { ProfileForm } from '@/components/account/profile-form';
import { requireCustomerAccess } from '@/lib/auth/customer-session';

export default async function ProfilePage() {
  const access = await requireCustomerAccess('/account');
  if (access.status !== 'customer') return <AccountAccessError type={access.status} />;
  return <ProfileForm initialProfile={access.profile} />;
}
