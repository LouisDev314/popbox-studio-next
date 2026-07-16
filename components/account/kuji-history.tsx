'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { Spinner } from '@/components/ui/spinner';
import QueryConfigs from '@/configs/api/query-config';
import type { IKujiHistoryItem, IKujiHistoryPage } from '@/interfaces/account';

interface IKujiGroup { key: string; orderPublicId: string; placedAt: string | null; product: IKujiHistoryItem['product']; tickets: IKujiHistoryItem[] }

function groupHistory(items: IKujiHistoryItem[]) {
  const groups = new Map<string, IKujiGroup>();
  items.forEach((ticket) => {
    const key = `${ticket.order.publicId}:${ticket.product.productId}`;
    const group = groups.get(key) ?? { key, orderPublicId: ticket.order.publicId, placedAt: ticket.order.placedAt, product: ticket.product, tickets: [] };
    group.tickets.push(ticket);
    groups.set(key, group);
  });
  return [...groups.values()];
}

export function KujiHistory({ initialPage }: { initialPage: IKujiHistoryPage }) {
  const query = useInfiniteQuery({
    queryKey: ['account', 'kuji'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => (await QueryConfigs.fetchAccountKujiHistory(pageParam)).data.data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: { pages: [initialPage], pageParams: [undefined] },
    retry: false,
  });
  const items = query.data.pages.flatMap((page) => page.items);
  const groups = groupHistory(items);

  if (groups.length === 0) {
    return <AccountEmptyState icon={Ticket} title="No Kuji history yet" description="Your Kuji tickets will appear here after an eligible purchase." actionHref="/products?type=kuji" actionLabel="Browse Kuji" />;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} className="border-b border-border pb-8">
          <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"><StorefrontImage src={group.product.imageUrl} alt={group.product.imageAltText ?? group.product.name} label={group.product.name} sizes="64px" imageClassName="object-cover" /></div>
            <div className="min-w-0"><h2 className="font-semibold">{group.product.name}</h2><p className="mt-1 text-sm text-muted-foreground"><Link href={`/account/orders/${encodeURIComponent(group.orderPublicId)}`} className="underline-offset-4 hover:text-foreground hover:underline">Order {group.orderPublicId}</Link>{group.placedAt ? ` · ${new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(group.placedAt))}` : ''} · {group.tickets.length} {group.tickets.length === 1 ? 'ticket' : 'tickets'}</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {group.tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border/70 px-4 py-3 text-sm"><p className="font-medium">Ticket</p>{ticket.voidedAt ? <p className="mt-1 text-muted-foreground">Voided{ticket.voidReason ? ` — ${ticket.voidReason}` : ''}</p> : ticket.revealedAt && ticket.prize ? <p className="mt-1 text-muted-foreground">Prize {ticket.prize.prizeCode} · {ticket.prize.name}</p> : <Link href={`/account/orders/${encodeURIComponent(group.orderPublicId)}#tickets`} className="mt-1 inline-flex font-medium text-primary underline-offset-4 hover:underline">Unrevealed — view tickets</Link>}</div>
            ))}
          </div>
        </section>
      ))}
      {query.hasNextPage ? <div className="flex flex-col items-center gap-3"><Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? <Spinner className="mr-2" /> : null}Load More</Button>{query.isFetchNextPageError ? <p className="text-sm text-destructive">More tickets could not be loaded. Try again.</p> : null}</div> : null}
    </div>
  );
}
