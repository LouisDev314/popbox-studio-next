'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { AccountProductIdentity } from '@/components/account/account-product-identity';
import { KujiPrizeTiles } from '@/components/kuji/kuji-prize-tiles';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import QueryConfigs from '@/configs/api/query-config';
import type { IKujiHistoryItem, IKujiHistoryPage } from '@/interfaces/account';

interface IKujiGroup { key: string; orderPublicId: string; placedAt: string | null; product: IKujiHistoryItem['product']; results: IKujiHistoryItem[] }

function groupHistory(items: IKujiHistoryItem[]) {
  const groups = new Map<string, IKujiGroup>();
  items.forEach((result) => {
    const key = `${result.order.publicId}:${result.product.productId}`;
    const group = groups.get(key) ?? { key, orderPublicId: result.order.publicId, placedAt: result.order.placedAt, product: result.product, results: [] };
    group.results.push(result);
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
    return <AccountEmptyState icon={Gift} title="No Kuji history yet" description="Your Kuji prizes will appear here after an eligible purchase." actionHref="/products?type=kuji" actionLabel="Browse Kuji" />;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} className="border-b border-border pb-8">
          <div className="flex gap-4">
            <div className="min-w-0">
              <AccountProductIdentity
                size="compact"
                name={group.product.name}
                productSlug={group.product.slug}
                isStorefrontAccessible={group.product.isStorefrontAccessible}
                imageUrl={group.product.imageUrl}
                imageAltText={group.product.imageAltText}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                <Link href={`/account/orders/${encodeURIComponent(group.orderPublicId)}`} className="underline-offset-4 hover:text-foreground hover:underline">Order {group.orderPublicId}</Link>
                {group.placedAt ? ` · ${new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(group.placedAt))}` : ''}
                {` · ${group.results.length} ${group.results.length === 1 ? 'prize' : 'prizes'}`}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {group.results.map((result) => {
              const revealedPrize = result.revealedAt ? result.prize : null;

              if (revealedPrize) {
                return (
                  <div key={result.id}>
                    <KujiPrizeTiles
                      compact
                      gridClassName="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1"
                      items={[
                        {
                          id: result.id,
                          prizeCode: revealedPrize.prizeCode,
                          prizeTier: revealedPrize.prizeTier,
                          name: revealedPrize.name,
                          description: revealedPrize.description,
                          imageUrl: revealedPrize.imageUrl,
                          stockLabel: result.voidedAt ? `${revealedPrize.prizeCode} · Voided` : `Prize ${revealedPrize.prizeCode}`,
                        },
                      ]}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Revealed {new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(result.revealedAt!))}
                    </p>
                  </div>
                );
              }

              if (result.voidedAt) {
                return (
                  <article key={result.id} className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm">
                    <p className="font-medium">Prize unavailable</p>
                    {result.voidReason ? <p className="mt-1 text-muted-foreground">{result.voidReason}</p> : null}
                  </article>
                );
              }

              return (
                <article key={result.id} className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm">
                  <p className="font-medium">Prize not revealed</p>
                  <Link href={`/account/orders/${encodeURIComponent(group.orderPublicId)}#kuji-prizes`} className="mt-2 inline-flex font-medium text-primary underline-offset-4 hover:underline">View order to reveal</Link>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {query.hasNextPage ? <div className="flex flex-col items-center gap-3"><Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? <Spinner className="mr-2" /> : null}Load More</Button>{query.isFetchNextPageError ? <p className="text-sm text-destructive">More prizes could not be loaded. Try again.</p> : null}</div> : null}
    </div>
  );
}
