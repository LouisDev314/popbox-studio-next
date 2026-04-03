'use client';

import { IOrderTicket } from '@/interfaces/order';
import { Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ITicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string) => void;
  isRevealing: boolean;
}

export function TicketRevealCard(props: ITicketRevealCardProps) {
  const isRevealed = !!props.ticket.prize;

  return (
    <div className={cn(
      'group relative w-full aspect-[2/3] cursor-pointer rounded-2xl border-2 transition-all duration-700 preserve-3d shadow-sm hover:shadow-md',
      isRevealed ? 'border-primary/50 bg-card' : 'border-border/80 bg-card hover:border-primary/50',
      props.isRevealing && 'pointer-events-none scale-105',
    )}
    style={{ perspective: '1000px' }}
    onClick={() => !isRevealed && !props.isRevealing && props.onReveal(props.ticket.id)}
    >
      <div
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-1000 preserve-3d',
          isRevealed ? '[transform:rotateY(180deg)]' : '',
        )}
      >
        {/* Front of ticket (Unrevealed) */}
        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center rounded-xl bg-card p-6">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary/70" />
          </div>
          <h3 className="font-extrabold text-2xl tracking-tight text-foreground opacity-90 text-center uppercase">
            Ichiban Kuji
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            {props.ticket.ticketNumber.substring(0, 8)}
          </p>

          <div className="absolute bottom-6 left-0 w-full flex justify-center">
            <span className={cn(
              'text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-background border transition-opacity duration-300',
              props.isRevealing ? 'opacity-0' : 'opacity-100',
            )}>
              Click to Reveal
            </span>
          </div>

          {props.isRevealing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/85">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Back of ticket (Revealed) */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] flex flex-col overflow-hidden rounded-xl bg-card">
          <div className="h-1/2 bg-muted/40 relative">
            {props.ticket.prize?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.ticket.prize.imageUrl} alt={props.ticket.prize.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-primary/30">
                {props.ticket.prize?.prizeCode}
              </div>
            )}
            <div className="absolute top-3 left-3 rounded-lg border border-border bg-background px-3 py-1 shadow-sm">
              <span className="font-extrabold text-sm text-foreground">Prize {props.ticket.prize?.prizeCode}</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center border-t border-border bg-card p-5">
            <h4 className="line-clamp-3 text-center text-lg font-bold leading-tight text-foreground">
              {props.ticket.prize?.name}
            </h4>
            <p className="mt-3 text-center text-xs font-medium text-muted-foreground opacity-80">
              {props.ticket.kujiProduct.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
