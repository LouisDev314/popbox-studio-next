import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrderTicketsPageClient from './order-tickets-page-client';
import {
  getGuestTicketsPath,
  getGuestAccessPath,
  getGuestTokenEntryPath,
  normalizeDynamicSegment,
  normalizeSearchValue,
} from '../guest-order-routing';
import {
  GuestAccessFailedState,
  GuestTicketsNotFoundState,
  GuestTicketsUnavailableState,
  InvalidOrderLinkState,
} from '../guest-order-states';
import { getPublicApiErrorStatus, getPublicGuestTickets } from '@/lib/api/public-storefront';
import { createPageMetadata } from '@/lib/seo';

type OrderTicketsPageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: OrderTicketsPageProps) {
  const params = await props.params;

  return createPageMetadata({
    title: 'Ticket reveals',
    description: 'Reveal and review your PopBox Studio Ichiban Kuji tickets.',
    path: `/orders/${encodeURIComponent(params.publicId)}/tickets`,
    noIndex: true,
  });
}

export default async function OrderTicketsPage(props: OrderTicketsPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const publicId = normalizeDynamicSegment(params.publicId);
  const token = normalizeSearchValue(searchParams.token);
  const handoff = normalizeSearchValue(searchParams.handoff);

  if (!publicId) {
    return <InvalidOrderLinkState />;
  }

  if (token && handoff === 'failed') {
    return <GuestAccessFailedState retryHref={getGuestTokenEntryPath(publicId, 'tickets', token)} />;
  }

  if (token) {
    redirect(getGuestAccessPath(publicId, 'tickets', token));
  }

  const cookieHeader = (await cookies()).toString() || undefined;
  let ticketView = null;
  let requestFailed = false;
  let errorStatus: number | null = null;

  try {
    ticketView = await getPublicGuestTickets(publicId, cookieHeader);
  } catch (error) {
    requestFailed = true;
    errorStatus = getPublicApiErrorStatus(error);
  }

  if (!ticketView) {
    if (requestFailed && errorStatus !== 403 && errorStatus !== 404) {
      return <GuestTicketsUnavailableState retryHref={getGuestTicketsPath(publicId)} />;
    }

    return <GuestTicketsNotFoundState />;
  }

  return <OrderTicketsPageClient initialViewData={ticketView} publicId={publicId} />;
}
