import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GuestOrderDetail } from './guest-order-detail';
import {
  getGuestOrderPath,
  getGuestAccessPath,
  normalizeDynamicSegment,
  normalizeSearchValue,
} from './guest-order-routing';
import {
  GuestAccessFailedState,
  GuestOrderNotFoundState,
  GuestOrderUnavailableState,
  InvalidOrderLinkState,
} from './guest-order-states';
import { getPublicApiErrorStatus, getPublicGuestOrder } from '@/lib/api/public-storefront';
import { createPageMetadata } from '@/lib/seo';

type GuestOrderPageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: GuestOrderPageProps) {
  const params = await props.params;

  return createPageMetadata({
    title: 'Order details',
    description: 'Review your PopBox Studio order details.',
    path: `/orders/${encodeURIComponent(params.publicId)}`,
    noIndex: true,
  });
}

export default async function GuestOrderPage(props: GuestOrderPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const publicId = normalizeDynamicSegment(params.publicId);
  const token = normalizeSearchValue(searchParams.token);
  const handoff = normalizeSearchValue(searchParams.handoff);

  if (!publicId) {
    return <InvalidOrderLinkState />;
  }

  if (handoff === 'failed') {
    return <GuestAccessFailedState />;
  }

  if (token) {
    redirect(getGuestAccessPath(publicId, 'order', token));
  }

  const cookieHeader = (await cookies()).toString() || undefined;
  let order = null;
  let requestFailed = false;
  let errorStatus: number | null = null;

  try {
    order = await getPublicGuestOrder(publicId, cookieHeader);
  } catch (error) {
    requestFailed = true;
    errorStatus = getPublicApiErrorStatus(error);
  }

  if (!order) {
    if (requestFailed && errorStatus !== 403 && errorStatus !== 404) {
      return <GuestOrderUnavailableState retryHref={getGuestOrderPath(publicId)} />;
    }

    return <GuestOrderNotFoundState />;
  }

  return <GuestOrderDetail order={order} />;
}
