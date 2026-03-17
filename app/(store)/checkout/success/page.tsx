import { CheckoutSuccessPageClient } from './success-page-client';

function normalizeSessionId(sessionId: string | string[] | undefined) {
  if (Array.isArray(sessionId)) {
    return sessionId[0] ?? null;
  }

  return sessionId ?? null;
}

export default async function CheckoutSuccessPage(props: PageProps<'/checkout/success'>) {
  const searchParams = await props.searchParams;
  const sessionId = normalizeSessionId(searchParams.session_id);

  return <CheckoutSuccessPageClient sessionId={sessionId} />;
}
