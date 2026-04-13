'use client';

import { type KeyboardEvent, type ReactNode } from 'react';
import { IOrderTicket } from '@/interfaces/order';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ITicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string) => void;
  isRevealing: boolean;
}

const TICKET_SHELL_CLASSNAME = 'relative h-full overflow-hidden rounded-[1.45rem] border border-border/70 bg-[linear-gradient(140deg,hsl(var(--background))_0%,hsl(var(--card))_65%,hsl(var(--muted)/0.55)_100%)] [clip-path:polygon(0_18px,18px_0,calc(100%-18px)_0,100%_18px,100%_calc(100%-18px),calc(100%-18px)_100%,18px_100%,0_calc(100%-18px))]';
const TICKET_GRID_CLASSNAME = 'grid h-full grid-cols-[minmax(0,1.3fr)_minmax(9.5rem,0.94fr)]';
const TICKET_MEDIA_CLASSNAME = 'relative overflow-hidden bg-muted/20';
const TICKET_RAIL_CLASSNAME = 'relative flex h-full flex-col justify-between bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] px-4 pb-4 pt-10 text-left';

function getTicketRootClassName(isRevealed: boolean, isRevealing: boolean) {
  return cn(
    'group relative w-full transition-all duration-700 preserve-3d',
    'aspect-[2.38/1] rounded-[1.75rem] border border-border/70 bg-transparent shadow-[0_24px_60px_-34px_rgba(15,23,42,0.55)]',
    isRevealed ? 'border-primary/25' : 'cursor-pointer',
    !isRevealed && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    !isRevealed && !isRevealing && 'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_30px_72px_-36px_rgba(15,23,42,0.62)]',
    isRevealing && 'pointer-events-none scale-105',
  );
}

function TicketShell(props: { children: ReactNode; accentClassName?: string; dividerOffsetClassName?: string }) {
  return (
    <div className={TICKET_SHELL_CLASSNAME}>
      <div className={cn('absolute inset-x-0 top-0 h-3', props.accentClassName ?? 'bg-[linear-gradient(90deg,hsl(var(--primary)/0.95)_0%,hsl(var(--primary)/0.72)_45%,hsl(var(--foreground)/0.12)_100%)]')} />
      <div className={TICKET_GRID_CLASSNAME}>
        {props.children}
      </div>
      <div className={cn(
        'pointer-events-none absolute inset-y-[14px] hidden w-px bg-[linear-gradient(180deg,transparent,hsl(var(--border)/0.9)_16%,hsl(var(--border)/0.9)_84%,transparent)] sm:block',
        props.dividerOffsetClassName ?? 'left-[calc(100%-9.6rem)]',
      )}
      />
    </div>
  );
}

function TicketPerforation() {
  return (
    <div className="relative h-full border-r border-dashed border-white/28" />
  );
}

function handleRevealClick(canReveal: boolean, onReveal: () => void) {
  if (!canReveal) {
    return;
  }

  onReveal();
}

function handleRevealKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  disabled: boolean,
  onReveal: () => void,
) {
  if (disabled) {
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onReveal();
  }
}

export function TicketRevealCard(props: ITicketRevealCardProps) {
  const prize = props.ticket.prize;
  const isRevealed = prize !== null;
  const kujiProductImageAlt = props.ticket.kujiProduct.imageAltText ?? props.ticket.kujiProduct.name;
  const canReveal = !isRevealed && !props.isRevealing;
  const revealTicket = () => props.onReveal(props.ticket.id);

  return (
    <div
      className={getTicketRootClassName(isRevealed, props.isRevealing)}
      style={{ perspective: '1000px' }}
      onClick={() => handleRevealClick(canReveal, revealTicket)}
      onKeyDown={(event) => handleRevealKeyDown(event, isRevealed || props.isRevealing, revealTicket)}
      role={isRevealed ? undefined : 'button'}
      tabIndex={isRevealed || props.isRevealing ? -1 : 0}
      aria-label={isRevealed ? undefined : `Reveal ticket for ${props.ticket.kujiProduct.name}`}
      aria-disabled={!isRevealed && props.isRevealing ? true : undefined}
      data-ticket-shape="kuji-ticket"
      data-ticket-state={isRevealed ? 'revealed' : 'unrevealed'}
    >
      <div
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-1000 preserve-3d',
          isRevealed ? '[transform:rotateY(180deg)]' : '',
        )}
      >
        {/* TODO: Front of ticket (Unrevealed) */}
        <div className="absolute inset-0 backface-hidden">
          <TicketShell>
            <div className={TICKET_MEDIA_CLASSNAME}>
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

              <TicketPerforation />
            </div>

            <div className={TICKET_RAIL_CLASSNAME}>
              <h3 className="line-clamp-3 text-base font-semibold leading-tight text-foreground sm:text-lg">
                {props.ticket.kujiProduct.name}
              </h3>

              <div className="space-y-3">
                <div className="h-px w-full bg-[linear-gradient(90deg,hsl(var(--border)),transparent)]" />
                <span
                  className={cn(
                    'inline-flex whitespace-nowrap items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80 transition-opacity duration-300',
                    props.isRevealing ? 'opacity-0' : 'opacity-100',
                  )}
                >
                  Reveal Me
                </span>
              </div>
            </div>
          </TicketShell>

          {props.isRevealing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.45rem] bg-background/78 backdrop-blur-[2px]">
              <div className="rounded-full border border-primary/25 bg-background/88 p-4 shadow-lg">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* TODO: Back of ticket (Revealed) */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)]">
          {prize ? (
            <TicketShell
              accentClassName="bg-[linear-gradient(90deg,#2d4e85_0%,#4c74b3_48%,rgba(15,23,42,0.18)_100%)]"
              dividerOffsetClassName="left-[calc(100%-9.6rem)]"
            >
              <div className={TICKET_MEDIA_CLASSNAME}>
                {prize.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prize.imageUrl}
                      alt={prize.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.01)_48%,rgba(15,23,42,0.26)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/34 via-black/8 to-transparent" />
                  </>
                ) : null}

                <TicketPerforation />
              </div>

              <div className={cn(TICKET_RAIL_CLASSNAME, 'gap-4')}>
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground/90">
                    Prize {prize.prizeCode}
                  </p>
                  <h4 className="line-clamp-3 text-base font-semibold leading-tight text-foreground sm:text-lg">
                    {prize.name}
                  </h4>
                  <p className="line-clamp-2 text-sm font-medium text-muted-foreground">
                    {props.ticket.kujiProduct.name}
                  </p>
                </div>
              </div>
            </TicketShell>
          ) : null}
        </div>
      </div>
    </div>
  );
}
