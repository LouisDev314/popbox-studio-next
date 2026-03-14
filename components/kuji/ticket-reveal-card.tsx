'use client';

import * as React from 'react';
import { IOrderTicket } from '@/interfaces/order';
import { Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface TicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string) => void;
  isRevealing: boolean;
}

export function TicketRevealCard({ ticket, onReveal, isRevealing }: TicketRevealCardProps) {
  const isRevealed = !!ticket.prize;
  
  return (
    <div className={cn(
      'group relative w-full aspect-[2/3] rounded-2xl border-2 transition-all duration-700 preserve-3d cursor-pointer shadow-sm hover:shadow-md',
      isRevealed ? 'border-primary/50' : 'border-border/80 hover:border-primary/50 hover:-translate-y-1 bg-gradient-to-br from-card to-accent',
      isRevealing && 'pointer-events-none scale-105',
    )}
    style={{ perspective: '1000px' }}
    onClick={() => !isRevealed && !isRevealing && onReveal(ticket.id)}
    >
      <div 
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-1000 preserve-3d',
          isRevealed ? '[transform:rotateY(180deg)]' : '',
        )}
      >
        {/* Front of ticket (Unrevealed) */}
        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 bg-[url('/noise.svg')] bg-opacity-20 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner border border-primary/20">
            <HelpCircle className="h-8 w-8 text-primary/70" />
          </div>
          <h3 className="font-extrabold text-2xl tracking-tight text-foreground opacity-90 text-center uppercase">
            Ichiban Kuji
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            {ticket.ticketNumber.substring(0, 8)}
          </p>

          <div className="absolute bottom-6 left-0 w-full flex justify-center">
            <span className={cn(
              'text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-background border transition-opacity duration-300',
              isRevealing ? 'opacity-0' : 'opacity-100',
            )}>
              Click to Reveal
            </span>
          </div>
          
          {isRevealing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl z-20">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Back of ticket (Revealed) */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-xl bg-card overflow-hidden shadow-inner flex flex-col">
          <div className="h-1/2 bg-muted/40 relative">
            {ticket.prize?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ticket.prize.imageUrl} alt={ticket.prize.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-primary/30">
                {ticket.prize?.prizeCode}
              </div>
            )}
            <div className="absolute top-3 left-3 px-3 py-1 bg-background/90 backdrop-blur-md rounded-lg border border-border shadow-sm">
              <span className="font-extrabold text-sm text-foreground">Prize {ticket.prize?.prizeCode}</span>
            </div>
          </div>
          <div className="flex-1 p-5 flex flex-col justify-center bg-gradient-to-t from-accent to-card border-t border-border">
            <h4 className="font-bold text-foreground text-center line-clamp-3 leading-tight text-lg drop-shadow-sm">
              {ticket.prize?.name}
            </h4>
            <p className="text-xs text-muted-foreground text-center mt-3 font-medium opacity-80">
              {ticket.kujiProduct.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
