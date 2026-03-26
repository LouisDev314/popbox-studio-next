import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrderTicketsPageClient from './order-tickets-page-client';
import {
  getGuestAccessPath,
  getGuestTokenEntryPath,
  normalizeDynamicSegment,
  normalizeSearchValue,
} from '../guest-order-routing';
import {
  GuestAccessFailedState,
  GuestTicketsNotFoundState,
  InvalidOrderLinkState,
} from '../guest-order-states';
import { getPublicGuestTickets } from '@/lib/api/public-storefront';

type OrderTicketsPageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

  try {
    ticketView = await getPublicGuestTickets(publicId, cookieHeader);
  } catch {
    ticketView = null;
  }

  if (!ticketView) {
    return <GuestTicketsNotFoundState />;
  }

  return <OrderTicketsPageClient initialViewData={ticketView} publicId={publicId} />;
}
