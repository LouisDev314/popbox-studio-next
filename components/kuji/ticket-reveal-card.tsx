'use client';

import { type ReactNode } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { IOrderTicket } from '@/interfaces/order';
import { cn } from '@/lib/utils';

interface ITicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string, focusTarget?: HTMLElement | null) => void;
  isRevealing: boolean;
}

function getTicketRootClassName(isRevealed: boolean, isRevealing: boolean) {
  return cn(
    'group relative w-full overflow-hidden rounded-[1.75rem] bg-background shadow-[0_24px_60px_-34px_rgba(15,23,42,0.55)] transition-all duration-700',
    'aspect-[1200/615]',
    !isRevealed && !isRevealing && 'hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-36px_rgba(15,23,42,0.62)]',
    isRevealing && 'pointer-events-none scale-[1.02]',
  );
}

function getFaceClassName(isInteractive: boolean) {
  return cn(
    'relative h-full w-full overflow-hidden rounded-[inherit] text-left',
    isInteractive && [
      'cursor-pointer appearance-none border-0 bg-transparent p-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    ],
  );
}

function TicketFace(props: {
  children: ReactNode;
  isInteractive?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const content = (
    <>
      <Image
        src="/kuji-ticket.webp"
        alt=""
        fill
        priority={false}
        sizes="(min-width: 1280px) 36rem, (min-width: 640px) 42rem, 100vw"
        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.015]"
      />
      {/* subtle readability mask (top + bottom only, no heavy full darkening) */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,28,0.35)_0%,rgba(8,13,28,0.08)_40%,rgba(8,13,28,0.45)_100%)]" />

      {/* very light left vignette for text only */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,13,28,0.45)_0%,rgba(8,13,28,0.18)_28%,rgba(8,13,28,0)_55%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        {props.children}
      </div>
    </>
  );

  if (props.isInteractive) {
    return (
      <button
        type="button"
        className={getFaceClassName(true)}
        onClick={props.onClick}
        aria-label={props.ariaLabel}
        aria-disabled={props.disabled ? true : undefined}
        disabled={props.disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={getFaceClassName(false)}>
      {content}
    </div>
  );
}

function TicketMeta(props: {
  eyebrow: string;
  title?: string | null;
  badge?: string | null;
}) {
  return (
    <>
      <div className="max-w-[58%] space-y-2 sm:max-w-[56%]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/72 sm:text-[11px]">
          {props.eyebrow}
        </p>
        {props.title ? (
          <h3 className="line-clamp-3 text-base font-semibold leading-tight text-white sm:text-lg">
            {props.title}
          </h3>
        ) : null}
      </div>

      <div className="max-w-[54%] space-y-2 sm:max-w-[50%]">
        {props.badge ? (
          <span className="inline-flex w-fit rounded-full bg-white/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/92 backdrop-blur-[2px] sm:text-[11px]">
            {props.badge}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function TicketRevealCard(props: ITicketRevealCardProps) {
  const isRevealed = Boolean(props.ticket.revealedAt);
  const prize = isRevealed ? props.ticket.prize : null;

  return (
    <div
      className={getTicketRootClassName(isRevealed, props.isRevealing)}
      style={{ perspective: '1000px' }}
      data-ticket-shape="kuji-ticket"
      data-ticket-state={isRevealed ? 'revealed' : 'unrevealed'}
    >
      <div
        className={cn(
          'absolute inset-0 h-full w-full transition-transform duration-1000 preserve-3d',
          isRevealed && 'transform-[rotateY(180deg)]',
        )}
      >
        <div className="absolute inset-0 backface-hidden">
          <TicketFace
            isInteractive={!isRevealed}
            ariaLabel={`Reveal ticket for ${props.ticket.kujiProduct.name}`}
            disabled={props.isRevealing}
            onClick={(event) => props.onReveal(props.ticket.id, event.currentTarget)}
          >
            <TicketMeta
              eyebrow="Ichiban Kuji"
              badge={props.isRevealing ? null : 'Tap to reveal'}
            />
          </TicketFace>

          {props.isRevealing ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/28 backdrop-blur-[1px]">
              <div className="rounded-full bg-background/88 p-4 shadow-lg">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)]">
          <TicketFace>
            <TicketMeta
              eyebrow={prize ? `Prize ${prize.prizeCode}` : 'Prize revealed'}
              title={prize?.name ?? 'Prize revealed'}
            />
          </TicketFace>
        </div>
      </div>
    </div>
  );
}
