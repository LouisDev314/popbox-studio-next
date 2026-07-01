'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { IOrderTicket } from '@/interfaces/order';
import { getPrizeTierLabel } from '@/lib/kuji-prize-codes';
import { cn } from '@/lib/utils';

interface ITicketRevealCardProps {
  ticket: IOrderTicket;
  onReveal: (id: string, focusTarget?: HTMLElement | null) => void;
  isRevealing: boolean;
  priority?: boolean;
}

const TICKET_SHAPE_CLASS = '[clip-path:polygon(4.25%_0,95.75%_0,100%_13.5%,100%_86.5%,95.75%_100%,4.25%_100%,0_86.5%,0_13.5%)]';

function getTicketRootClassName(isRevealed: boolean, isRevealing: boolean) {
  return cn(
    'group relative w-full overflow-visible bg-transparent [filter:drop-shadow(0_24px_26px_rgba(51,22,42,0.28))] transition-all duration-500 ease-out',
    'aspect-[1200/615]',
    !isRevealed && !isRevealing && 'hover:-translate-y-[3px] hover:scale-[1.02] hover:[filter:drop-shadow(0_30px_32px_rgba(51,22,42,0.36))]',
    isRevealing && 'pointer-events-none scale-[1.02]',
  );
}

function getFaceClassName(isInteractive: boolean) {
  return cn(
    TICKET_SHAPE_CLASS,
    'relative h-full w-full overflow-hidden bg-background text-left',
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
  priority?: boolean;
}) {
  const [isTicketImageLoaded, setIsTicketImageLoaded] = useState(false);
  const [hasTicketImageError, setHasTicketImageError] = useState(false);
  const ticketImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = ticketImageRef.current;
    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted && image?.complete && image.naturalWidth > 0) {
        setIsTicketImageLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const content = (
    <>
      {!isTicketImageLoaded && !hasTicketImageError ? (
        <Skeleton
          aria-hidden="true"
          data-testid="ticket-image-skeleton"
          className="absolute inset-0 h-full w-full rounded-none bg-muted/60"
        />
      ) : null}
      {!hasTicketImageError ? (
        <Image
          ref={ticketImageRef}
          src="/kuji-ticket.webp"
          alt=""
          fill
          fetchPriority={props.priority ? 'high' : undefined}
          loading={props.priority ? 'eager' : undefined}
          priority={props.priority ?? false}
          sizes="(min-width: 1280px) 36rem, (min-width: 640px) 42rem, 100vw"
          className={cn(
            'object-cover object-center transition-all duration-700 ease-out group-data-[ticket-state=unrevealed]:saturate-[0.94] group-hover:scale-[1.015]',
            isTicketImageLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onError={() => setHasTicketImageError(true)}
          onLoad={() => setIsTicketImageLoaded(true)}
        />
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.34)_0%,rgba(255,244,250,0.16)_34%,rgba(255,255,255,0)_62%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(219,39,119,0.16)] ring-1 ring-inset ring-white/65"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[-24%] left-[-35%] z-[1] w-[18%] -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)] opacity-0 motion-safe:animate-[ticket-shine-sweep_5.4s_ease-in-out_infinite] motion-reduce:hidden"
      />
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-foreground/68 sm:text-[11px]">
          {props.eyebrow}
        </p>
        {props.title ? (
          <h3 className="line-clamp-3 text-base font-semibold leading-tight text-foreground sm:text-lg">
            {props.title}
          </h3>
        ) : null}
      </div>

      <div className="max-w-[54%] space-y-2 sm:max-w-[50%]">
        {props.badge ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-[0_10px_28px_-18px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-sm sm:text-[11px]">
            {props.badge}
            <Sparkles aria-hidden="true" className="h-3 w-3 text-primary-foreground/75" />
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
            priority={props.priority}
          >
            <TicketMeta
              eyebrow="Ichiban Kuji"
              badge={props.isRevealing ? null : 'Tap to reveal'}
            />
          </TicketFace>

          {props.isRevealing ? (
            <div
              className={cn(
                TICKET_SHAPE_CLASS,
                'absolute inset-0 z-20 flex items-center justify-center bg-background/28 backdrop-blur-[1px]',
              )}
            >
              <div className="rounded-full bg-background/88 p-4 shadow-lg">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)]">
          <TicketFace>
            <TicketMeta
              eyebrow={prize ? getPrizeTierLabel(prize.prizeTier) : 'Prize revealed'}
              title={prize?.name ?? 'Prize revealed'}
            />
          </TicketFace>
        </div>
      </div>
    </div>
  );
}
