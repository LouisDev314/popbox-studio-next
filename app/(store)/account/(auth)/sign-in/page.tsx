import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { SignInForm } from '@/components/auth/auth-forms';
import { redirectAuthenticatedAccountUser } from '@/lib/auth/customer-session';
import { validateInternalNext } from '@/lib/auth/redirects';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next: requestedNext, reset } = await searchParams;
  const next = validateInternalNext(requestedNext);
  await redirectAuthenticatedAccountUser(next);
  return <AuthSplitLayout title="Sign In"><SignInForm next={next} showResetSuccess={reset === 'success'} /></AuthSplitLayout>;
}
