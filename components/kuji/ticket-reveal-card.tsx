'use client';

import { type KeyboardEvent } from 'react';
import { IOrderTicket } from '@/interfaces/order';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ITicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string) => void;
  isRevealing: boolean;
}

export function TicketRevealCard(props: ITicketRevealCardProps) {
  const prize = props.ticket.prize;
  const isRevealed = prize !== null;
  const kujiProductImageAlt = props.ticket.kujiProduct.imageAltText ?? props.ticket.kujiProduct.name;
  const canReveal = !isRevealed && !props.isRevealing;

  const handleReveal = () => {
    if (!canReveal) {
      return;
    }

    props.onReveal(props.ticket.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isRevealed || props.isRevealing) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onReveal(props.ticket.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative w-full transition-all duration-700 preserve-3d',
        isRevealed ? 'aspect-[2/3]' : 'aspect-[2.38/1]',
        isRevealed
          ? 'rounded-2xl border-2 border-primary/50 bg-card shadow-sm'
          : 'cursor-pointer rounded-[1.75rem] border border-border/70 bg-transparent shadow-[0_24px_60px_-34px_rgba(15,23,42,0.55)] hover:-translate-y-0.5 hover:shadow-[0_30px_72px_-36px_rgba(15,23,42,0.62)]',
        !isRevealed && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        !isRevealed && !props.isRevealing && 'hover:border-primary/35',
        props.isRevealing && 'pointer-events-none scale-105',
      )}
      style={{ perspective: '1000px' }}
      onClick={handleReveal}
      onKeyDown={handleKeyDown}
      role={isRevealed ? undefined : 'button'}
      tabIndex={isRevealed || props.isRevealing ? -1 : 0}
      aria-label={isRevealed ? undefined : `Reveal ticket for ${props.ticket.kujiProduct.name}`}
      aria-disabled={!isRevealed && props.isRevealing ? true : undefined}
    >
      <div
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-1000 preserve-3d',
          isRevealed ? '[transform:rotateY(180deg)]' : '',
        )}
      >
        {/* TODO: Front of ticket (Unrevealed) */}
        <div className="absolute inset-0 backface-hidden">
          <div className="relative h-full overflow-hidden rounded-[1.45rem] border border-border/70 bg-[linear-gradient(140deg,hsl(var(--background))_0%,hsl(var(--card))_65%,hsl(var(--muted)/0.55)_100%)] [clip-path:polygon(0_18px,18px_0,calc(100%-18px)_0,100%_18px,100%_calc(100%-18px),calc(100%-18px)_100%,18px_100%,0_calc(100%-18px))]">
            <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,hsl(var(--primary)/0.95)_0%,hsl(var(--primary)/0.72)_45%,hsl(var(--foreground)/0.12)_100%)]" />
            <div className="grid h-full grid-cols-[minmax(0,1.3fr)_minmax(8.75rem,0.92fr)]">
              <div className="relative overflow-hidden bg-muted/20">
                {props.ticket.kujiProduct.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={props.ticket.kujiProduct.imageUrl}
                      alt={kujiProductImageAlt}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.12)_0%,rgba(10,10,10,0.02)_48%,rgba(10,10,10,0.28)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/48 via-black/12 to-transparent" />
                  </>
                ) : null}

                <div className="absolute left-4 top-5">
                  <span className="inline-flex items-center rounded-full border border-white/22 bg-background/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground shadow-sm backdrop-blur-md">
                    Ichiban Kuji
                  </span>
                </div>

                <div className="absolute inset-y-5 right-0 flex items-center">
                  <div className="relative h-full border-r border-dashed border-white/28">
                    <span className="absolute -left-3 top-5 h-6 w-6 rounded-full bg-background/96 ring-1 ring-border/40" />
                    <span className="absolute -left-3 bottom-5 h-6 w-6 rounded-full bg-background/96 ring-1 ring-border/40" />
                  </div>
                </div>
              </div>

              <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] px-4 pb-4 pt-6 text-left">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground/90">
                    Ticket
                  </p>
                  <h3 className="line-clamp-3 text-base font-semibold leading-tight text-foreground sm:text-lg">
                    {props.ticket.kujiProduct.name}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="h-px w-full bg-[linear-gradient(90deg,hsl(var(--border)),transparent)]" />
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-opacity duration-300',
                      props.isRevealing ? 'opacity-0' : 'opacity-100',
                    )}
                  >
                    Tap to Reveal
                  </span>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-[14px] left-[calc(100%-8.85rem)] hidden w-px bg-[linear-gradient(180deg,transparent,hsl(var(--border)/0.9)_16%,hsl(var(--border)/0.9)_84%,transparent)] sm:block" />
          </div>

          {props.isRevealing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.45rem] bg-background/78 backdrop-blur-[2px]">
              <div className="rounded-full border border-primary/25 bg-background/88 p-4 shadow-lg">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* TODO: Back of ticket (Revealed) */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] p-1.5">
          {prize ? (
            <div className="flex h-full flex-col overflow-hidden rounded-[1.15rem] bg-card shadow-[0_22px_48px_-28px_rgba(15,23,42,0.55)]">
              <div className="relative flex-[1.45] overflow-hidden bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prize.imageUrl!}
                  alt={prize.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/18 via-black/5 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-background/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground shadow-sm backdrop-blur-md">
                    PRIZE
                    {' '}
                    {prize.prizeCode}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-center gap-2 px-4 pb-5 pt-4">
                <h4 className="line-clamp-3 text-center text-lg font-semibold leading-tight text-foreground">
                  {prize.name}
                </h4>
                <p className="line-clamp-2 text-center text-sm font-medium text-muted-foreground">
                  {props.ticket.kujiProduct.name}
                </p>
                {prize.description ? (
                  <p className="line-clamp-3 text-center text-sm leading-6 text-muted-foreground">
                    {prize.description}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
