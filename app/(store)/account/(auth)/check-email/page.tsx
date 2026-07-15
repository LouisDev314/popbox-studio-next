import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { CheckEmailState } from '@/components/auth/auth-forms';
import { validateInternalNext } from '@/lib/auth/redirects';

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthSplitLayout title="Check Your Email"><CheckEmailState next={validateInternalNext(next)} /></AuthSplitLayout>;
}
