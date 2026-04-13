'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, PanelRightOpen, Ticket as TicketIcon } from 'lucide-react';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { IGuestTicketView, IOrderTicket } from '@/interfaces/order';
import { TicketRevealCard } from '@/components/kuji/ticket-reveal-card';
import { Button } from '@/components/ui/button';
import { getGuestOrderPath } from '../guest-order-routing';

interface IOrderTicketsPageClientProps {
  initialViewData: IGuestTicketView;
  publicId: string;
}

export default function OrderTicketsPageClient(props: IOrderTicketsPageClientProps) {
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [isRevealingAll, setIsRevealingAll] = useState(false);
  const [viewData, setViewData] = useState(props.initialViewData);
  const orderHref = getGuestOrderPath(props.publicId);

  const refreshTickets = useCallback(async () => {
    try {
      const response = await QueryConfigs.fetchGuestTickets(props.publicId);
      if (response.data.data) {
        setViewData(response.data.data);
      }
    } catch {
      // Preserve the last successful state if refresh fails.
    }
  }, [props.publicId]);

  const { mutation: revealSingle } = useCustomizeMutation<IOrderTicket, { publicId: string; ticketId: string }>({
    mutationFn: (args: { publicId: string; ticketId: string }) => MutationConfigs.revealTicket(args),
    onSettled: () => {
      setRevealingId(null);
      void refreshTickets();
    },
  });

  const { mutation: revealAll } = useCustomizeMutation<IGuestTicketView, string>({
    mutationFn: (id: string) => MutationConfigs.revealAllTickets(id),
    onSettled: () => {
      setIsRevealingAll(false);
      void refreshTickets();
    },
  });

  const handleReveal = useCallback(
    (ticketId: string) => {
      if (revealingId || isRevealingAll) return;
      setRevealingId(ticketId);

      setTimeout(() => {
        revealSingle({ publicId: props.publicId, ticketId });
      }, 1500);
    },
    [isRevealingAll, props.publicId, revealSingle, revealingId],
  );

  const handleRevealAll = () => {
    if (isRevealingAll || revealingId) return;
    setIsRevealingAll(true);

    setTimeout(() => {
      revealAll(props.publicId);
    }, 2000);
  };

  const { unrevealed, revealed, counts } = viewData;
  const allRevealed = unrevealed.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl min-h-[70vh]">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={orderHref}
          className="hover:text-foreground text-sm font-medium text-muted-foreground inline-flex items-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order
        </Link>

        <div className="flex rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-semibold tracking-wide">
          <span className="text-primary">{counts.revealed}</span>
          <span className="text-muted-foreground mx-1">/</span>
          <span className="text-foreground">{counts.total} Revealed</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-border pb-8">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
            <TicketIcon className="h-10 w-10 text-primary lg:h-12 lg:w-12" />
            Your Tickets
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {allRevealed
              && 'All your prizes have been revealed! They will be shipped to you soon.'}
          </p>
        </div>

        {allRevealed ? null : (
          <Button
            size="lg"
            onClick={handleRevealAll}
            disabled={isRevealingAll || revealingId !== null}
            className="h-14 rounded-xl px-8 text-lg font-bold transition-all active:scale-95"
          >
            {isRevealingAll ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Revealing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PanelRightOpen className="h-5 w-5" />
                Reveal All
              </span>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-16">
        {unrevealed.length > 0 ? (
          <section>
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <p className="text-xl">Awaiting Reveal ({unrevealed.length})</p>
            </h2>
            <div className="grid grid-cols-1 gap-4 justify-items-center sm:gap-5 xl:grid-cols-2 xl:gap-6">
              {unrevealed.map((ticket: IOrderTicket) => (
                <div key={ticket.id} className="w-full max-w-[38rem]">
                  <TicketRevealCard
                    ticket={ticket}
                    onReveal={handleReveal}
                    isRevealing={revealingId === ticket.id || isRevealingAll}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* TODO: use ticket pictures and show real prizes with dialog */}
        {revealed.length > 0 ? (
          <section>
            <h2 className="mb-8 text-xl font-semibold tracking-tight text-foreground/80">
              Revealed Prizes ({revealed.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-6 justify-items-center">
              {revealed.map((ticket: IOrderTicket) => (
                <div key={ticket.id} className="w-full max-w-[200px]">
                  <TicketRevealCard
                    ticket={ticket}
                    onReveal={() => {}}
                    isRevealing={false}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
