'use client';

import { useEffect, useState } from 'react';
import { Gift, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { INormalizedTicket } from '@/interfaces/account';

interface IOrderTicketExperienceProps {
  initialTickets: INormalizedTicket[];
  onRevealAll: () => Promise<INormalizedTicket[]>;
  onRevealOne: (ticketId: string) => Promise<INormalizedTicket>;
}

export function OrderTicketExperience(props: IOrderTicketExperienceProps) {
  const [tickets, setTickets] = useState(props.initialTickets);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [isRevealingAll, setIsRevealingAll] = useState(false);
  const [error, setError] = useState('');
  const unrevealed = tickets.filter((ticket) => !ticket.revealedAt && !ticket.voidedAt);

  useEffect(() => setTickets(props.initialTickets), [props.initialTickets]);

  const revealOne = async (ticketId: string) => {
    setError('');
    setPendingTicketId(ticketId);
    try {
      const revealed = await props.onRevealOne(ticketId);
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? revealed : ticket));
      window.setTimeout(() => document.getElementById(`reveal-ticket-${ticketId}`)?.focus(), 0);
    } catch {
      setError('This ticket could not be revealed. Please try again.');
    } finally {
      setPendingTicketId(null);
    }
  };

  const revealAll = async () => {
    setError('');
    setIsRevealingAll(true);
    try {
      setTickets(await props.onRevealAll());
    } catch {
      setError('Your tickets could not be revealed. Please try again.');
    } finally {
      setIsRevealingAll(false);
    }
  };

  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">This order has no Kuji tickets.</p>;
  }

  return (
    <div className="space-y-5">
      {unrevealed.length > 1 ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" disabled={isRevealingAll || pendingTicketId !== null} onClick={revealAll}>
            {isRevealingAll ? <Spinner className="mr-2" /> : <Gift className="mr-2 h-4 w-4" />}
            Reveal All
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Ticket className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Ticket</p>
                <p className="font-semibold text-foreground">{ticket.ticketNumber}</p>
                {ticket.voidedAt ? <p className="mt-3 text-sm text-muted-foreground">Voided{ticket.voidReason ? ` — ${ticket.voidReason}` : ''}</p> : null}
                {ticket.revealedAt && ticket.prize ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">{ticket.prize.prizeCode}</p>
                    <p className="mt-1 text-sm font-medium">{ticket.prize.name}</p>
                  </div>
                ) : null}
                {!ticket.revealedAt && !ticket.voidedAt ? (
                  <Button
                    id={`reveal-ticket-${ticket.id}`}
                    type="button"
                    size="sm"
                    className="mt-4"
                    disabled={pendingTicketId !== null || isRevealingAll}
                    onClick={() => revealOne(ticket.id)}
                  >
                    {pendingTicketId === ticket.id ? <Spinner className="mr-2" /> : null}
                    Reveal Ticket
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
