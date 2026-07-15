import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { CheckEmailState } from '@/components/auth/auth-forms';
import { redirectAuthenticatedAccountUser } from '@/lib/auth/customer-session';
import { validateInternalNext } from '@/lib/auth/redirects';

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: requestedNext } = await searchParams;
  const next = validateInternalNext(requestedNext);
  await redirectAuthenticatedAccountUser(next);
  return <AuthSplitLayout title="Check Your Email"><CheckEmailState next={next} /></AuthSplitLayout>;
}
