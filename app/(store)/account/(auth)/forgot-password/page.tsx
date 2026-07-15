import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';
import { redirectAuthenticatedAccountUser } from '@/lib/auth/customer-session';

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedAccountUser('/account');
  return <AuthSplitLayout title="Forgot Password"><ForgotPasswordForm /></AuthSplitLayout>;
}
