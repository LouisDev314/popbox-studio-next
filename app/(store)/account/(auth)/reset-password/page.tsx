import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ResetPasswordForm } from '@/components/auth/auth-forms';

export default function ResetPasswordPage() {
  return <AuthSplitLayout title="Reset Password"><ResetPasswordForm /></AuthSplitLayout>;
}
