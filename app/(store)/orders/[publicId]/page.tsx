import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GuestOrderDetail } from './guest-order-detail';
import {
  getGuestAccessPath,
  getGuestTokenEntryPath,
  normalizeDynamicSegment,
  normalizeSearchValue,
} from './guest-order-routing';
import {
  GuestAccessFailedState,
  GuestOrderNotFoundState,
  InvalidOrderLinkState,
} from './guest-order-states';
import { getPublicGuestOrder } from '@/lib/api/public-storefront';

type GuestOrderPageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GuestOrderPage(props: GuestOrderPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const publicId = normalizeDynamicSegment(params.publicId);
  const token = normalizeSearchValue(searchParams.token);
  const handoff = normalizeSearchValue(searchParams.handoff);

  if (!publicId) {
    return <InvalidOrderLinkState />;
  }

  if (token && handoff === 'failed') {
    return <GuestAccessFailedState retryHref={getGuestTokenEntryPath(publicId, 'order', token)} />;
  }

  if (token) {
    redirect(getGuestAccessPath(publicId, 'order', token));
  }

  const cookieHeader = (await cookies()).toString() || undefined;
  let order = null;

  try {
    order = await getPublicGuestOrder(publicId, cookieHeader);
  } catch {
    order = null;
  }

  if (!order) {
    return <GuestOrderNotFoundState />;
  }

  return <GuestOrderDetail order={order} />;
}
