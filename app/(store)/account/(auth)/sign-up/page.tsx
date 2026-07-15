import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { SignUpForm } from '@/components/auth/auth-forms';
import { redirectAuthenticatedAccountUser } from '@/lib/auth/customer-session';
import { validateInternalNext } from '@/lib/auth/redirects';

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: requestedNext } = await searchParams;
  const next = validateInternalNext(requestedNext);
  await redirectAuthenticatedAccountUser(next);
  return <AuthSplitLayout title="Create an Account"><SignUpForm next={next} /></AuthSplitLayout>;
}
