'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import { IGuestTicketView, IOrderTicket } from '@/interfaces/order';
import { TicketRevealCard } from '@/components/kuji/ticket-reveal-card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Ticket as TicketIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

export default function OrderTicketsPage() {
  const params = useParams();
  const publicId = Array.isArray(params.publicId) ? params.publicId[0] : params.publicId;
  const queryClient = useQueryClient();

  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [isRevealingAll, setIsRevealingAll] = useState(false);

  const { data: response, isPending, isError } = useCustomizeQuery<IGuestTicketView>({
    queryKey: ['order-tickets', publicId],
    queryFn: () => QueryConfigs.fetchGuestTickets(publicId!),
    enabled: !!publicId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const { mutation: revealSingle } = useCustomizeMutation<IOrderTicket, { publicId: string; ticketId: string }>({
    mutationFn: (args: { publicId: string; ticketId: string }) => MutationConfigs.revealTicket(args),
    onSettled: () => {
      setRevealingId(null);
      queryClient.invalidateQueries({ queryKey: ['order-tickets', publicId] });
      queryClient.invalidateQueries({ queryKey: ['guest-order', publicId] });
    },
  });

  const { mutation: revealAll } = useCustomizeMutation<IGuestTicketView, string>({
    mutationFn: (id: string) => MutationConfigs.revealAllTickets(id),
    onSettled: () => {
      setIsRevealingAll(false);
      queryClient.invalidateQueries({ queryKey: ['order-tickets', publicId] });
      queryClient.invalidateQueries({ queryKey: ['guest-order', publicId] });
    },
  });

  const viewData = response?.data?.data;

  const handleReveal = useCallback(
    (ticketId: string) => {
      if (revealingId || isRevealingAll) return;
      setRevealingId(ticketId);
      
      // Artificial delay for suspense/excitement before actually submitting to the server
      setTimeout(() => {
        revealSingle({ publicId: publicId as string, ticketId });
      }, 1500);
    },
    [publicId, revealSingle, revealingId, isRevealingAll],
  );

  const handleRevealAll = () => {
    if (isRevealingAll || revealingId) return;
    setIsRevealingAll(true);
    
    // Artificial suspense delay
    setTimeout(() => {
      revealAll(publicId as string);
    }, 2000);
  };

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !viewData) {
    return (
      <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Tickets Not Found</h1>
        <p className="text-muted-foreground mb-8">This order might not exist or doesn&apos;t have any tickets.</p>
        <Button asChild variant="outline">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const { unrevealed, revealed, counts } = viewData;

  const allRevealed = unrevealed.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl min-h-[70vh]">
      <div className="mb-8 flex items-center justify-between">
        <Link 
          href={`/orders/${publicId}`} 
          className="hover:text-foreground text-sm font-medium text-muted-foreground inline-flex items-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order
        </Link>
        
        <div className="flex bg-muted/50 rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide border border-border">
          <span className="text-primary">{counts.revealed}</span>
          <span className="text-muted-foreground mx-1">/</span>
          <span className="text-foreground">{counts.total} Revealed</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground flex items-center gap-4">
            <TicketIcon className="h-10 w-10 lg:h-12 lg:w-12 text-primary drop-shadow-sm" />
            Your Ticket Box
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {allRevealed 
              ? 'All your prizes have been revealed! They will be shipped to you soon.' 
              : 'Click a ticket to reveal your prize instantly, or use the button below to reveal all simultaneously.'}
          </p>
        </div>
        
        {!allRevealed && (
          <Button 
            size="lg" 
            onClick={handleRevealAll}
            disabled={isRevealingAll || revealingId !== null}
            className="rounded-full shadow-lg font-bold text-lg px-8 h-14 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all active:scale-95"
          >
            {isRevealingAll ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Revealing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Reveal All Now
              </span>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-16">
        {/* Unrevealed Tickets Section */}
        {unrevealed.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-8 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Awaiting Reveal ({unrevealed.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8 justify-items-center">
              {unrevealed.map((ticket: IOrderTicket) => (
                <div key={ticket.id} className="w-full max-w-[200px]">
                  <TicketRevealCard
                    ticket={ticket}
                    onReveal={handleReveal}
                    isRevealing={revealingId === ticket.id || isRevealingAll}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Revealed Tickets Section */}
        {revealed.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-8 text-foreground/80">
              Revealed Prizes ({revealed.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8 justify-items-center">
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
        )}
      </div>
    </div>
  );
}
