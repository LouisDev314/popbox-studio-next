'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { KujiPrizeTiles, type IKujiPrizeTileItem } from '@/components/kuji/kuji-prize-tiles';
import { getPrizeTierLabel } from '@/lib/kuji-prize-codes';
import { cn } from '@/lib/utils';
import type { IOrderTicket } from '@/interfaces/order';

export type TKujiRevealOverlayPhase =
  | 'playingRevealVideo'
  | 'waitingForRevealResult'
  | 'showingSingleRevealResult'
  | 'showingAllRevealedSummary';

export type TKujiRevealOverlayMode = 'all' | 'single';

interface IKujiRevealOverlayProps {
  currentTicket: IOrderTicket | null;
  hasNextTicket: boolean;
  isOpen: boolean;
  mode: TKujiRevealOverlayMode | null;
  onAdvanceToNext: () => void;
  onReturnToTickets: () => void;
  onVideoComplete: () => void;
  phase: TKujiRevealOverlayPhase;
  progressLabel: string | null;
  summaryTickets: IOrderTicket[];
}

function OverlayAtmosphere(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-dvh w-full flex-col overflow-x-hidden bg-[linear-gradient(180deg,#faf8f3_0%,#f6f3ec_48%,#f3efe6_100%)] text-foreground',
        'before:absolute before:-left-24 before:top-12 before:h-64 before:w-64 before:rounded-full before:bg-primary/10 before:blur-3xl before:content-[\'\']',
        'after:absolute after:-right-20 after:bottom-12 after:h-72 after:w-72 after:rounded-full after:bg-sky-200/30 after:blur-3xl after:content-[\'\']',
        props.className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_56%)]" />
      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">
        {props.children}
      </div>
    </div>
  );
}

function buildSummaryPrizeTiles(tickets: IOrderTicket[]): IKujiPrizeTileItem[] {
  return tickets.flatMap((ticket) => {
    if (!ticket.prize) {
      return [];
    }

    return [{
      description: ticket.prize.description,
      id: ticket.id,
      imageUrl: ticket.prize.imageUrl,
      kujiProductName: ticket.kujiProduct.name,
      name: ticket.prize.name,
      prizeCode: ticket.prize.prizeCode,
      prizeTier: ticket.prize.prizeTier,
    }];
  });
}

function KujiRevealVideoView(props: {
  mode: TKujiRevealOverlayMode | null;
  onVideoComplete: () => void;
}) {
  return (
    <OverlayAtmosphere className="bg-[#08111f] text-white before:bg-sky-500/18 after:bg-cyan-400/14">
      <div className="relative flex h-full min-h-0 flex-1 items-center justify-center">
        <video
          autoPlay
          controls={false}
          muted
          onEnded={props.onVideoComplete}
          onError={props.onVideoComplete}
          playsInline
          preload="auto"
          src="/kuji-reveal.mp4"
          className="absolute inset-0 h-full w-full object-cover"
          data-testid="kuji-reveal-video"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.02)_32%,rgba(2,6,23,0.48)_100%)]" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 via-black/16 to-transparent"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={props.onVideoComplete}
          className="h-11 min-w-28 rounded-full border-white/24 bg-white/12 px-6 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/18 hover:text-white"
        >
          Skip
        </Button>
      </div>
    </OverlayAtmosphere>
  );
}

function KujiRevealWaitingView(props: {
  mode: TKujiRevealOverlayMode | null;
}) {
  return (
    <OverlayAtmosphere className="before:bg-primary/8 after:bg-sky-200/20">
      <div className="flex h-full min-h-0 flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto rounded-[2rem] border border-border/70 bg-background/88 px-6 py-8 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-background shadow-sm">
              <Loader2 className="h-7 w-7 animate-spin text-foreground" />
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {props.mode === 'all' ? 'Preparing your results' : 'Preparing your result'}
              </p>

              <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground sm:text-base">
                Your draw is still processing. It’ll appear here shortly.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <span className="inline-flex rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-foreground/80 uppercase">
            Processing
              </span>
            </div>
          </div>
        </div>
      </div>
    </OverlayAtmosphere>
  );
}

function KujiSingleRevealResultView(props: {
  onAdvanceToNext: () => void;
  onReturnToTickets: () => void;
  progressLabel: string | null;
  ticket: IOrderTicket;
}) {
  const prizeName = props.ticket.prize?.name ?? 'Prize revealed';
  const prizeTierLabel = getPrizeTierLabel(props.ticket.prize?.prizeTier);

  return (
    <OverlayAtmosphere>
      <div className="flex h-full min-h-0 flex-col items-center justify-between overflow-y-auto px-5 pb-12 pt-12 sm:px-8 sm:pb-20 sm:pt-14">
        <div className="w-full max-w-sm space-y-4 text-center sm:max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Congratulations
          </h2>
          <p className="text-lg font-semibold text-muted-foreground">
            {prizeTierLabel} · {prizeName}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/78 shadow-sm">
              {prizeTierLabel}
            </span>
            {props.progressLabel ? (
              <span className="inline-flex rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                {props.progressLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-sm py-8 sm:max-w-md">
          <div className="mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-border/70 bg-background/70 p-4 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm">
            <StorefrontImage
              src={props.ticket.prize?.imageUrl}
              alt={prizeName}
              label={prizeName}
              className="h-full w-full overflow-hidden rounded-[1.5rem]"
              sizes="(max-width: 640px) calc(100vw - 2.5rem), 22rem"
              imageClassName="h-full w-full"
              priority
            />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md gap-3 px-4">
          <Button
            type="button"
            variant="outline"
            onClick={props.onReturnToTickets}
            className="h-12 min-w-0 flex-1 rounded-full px-6 text-sm font-semibold sm:text-base"
          >
            <span className="truncate">Back to tickets</span>
          </Button>

          <Button
            type="button"
            onClick={props.onAdvanceToNext}
            className="h-12 min-w-0 flex-1 rounded-full px-6 text-sm font-semibold shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] sm:h-13 sm:text-base"
          >
            <span className="truncate">Reveal next</span>
          </Button>
        </div>
      </div>
    </OverlayAtmosphere>
  );
}

function KujiAllPrizesSummaryView(props: {
  onReturnToTickets: () => void;
  tickets: IOrderTicket[];
}) {
  const prizeTiles = buildSummaryPrizeTiles(props.tickets);

  return (
    <OverlayAtmosphere>
      <div className="flex h-full min-h-0 flex-1 flex-col px-4 pb-4 pt-8 sm:px-6 sm:pb-6 sm:pt-10">
        <h2 className="mt-3 text-center pb-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Congratulations
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="mx-auto w-full max-w-5xl px-1 sm:px-2">
            <KujiPrizeTiles
              compact
              enableDialog={false}
              dialogModal={false}
              items={prizeTiles}
              emptyState={(
                <div className="flex min-h-56 items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground sm:text-base">
                  Your ticket summary is syncing. You can return now, and the updated prize list will remain on the tickets page.
                </div>
              )}
            />
          </div>
        </div>

        <div
          className="shrink-0 pt-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          <div className="mx-auto w-full max-w-sm">
            <Button
              type="button"
              onClick={props.onReturnToTickets}
              className="h-13 w-full rounded-full px-6 text-base font-semibold shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)]"
            >
              Return
            </Button>
          </div>
        </div>
      </div>
    </OverlayAtmosphere>
  );
}

export function KujiRevealOverlay(props: IKujiRevealOverlayProps) {
  return (
    <DialogPrimitive.Root open={props.isOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/18 backdrop-blur-md" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[81] outline-none"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Ticket reveal overlay
          </DialogPrimitive.Title>

          {props.phase === 'playingRevealVideo' ? (
            <KujiRevealVideoView
              mode={props.mode}
              onVideoComplete={props.onVideoComplete}
            />
          ) : null}

          {props.phase === 'waitingForRevealResult' ? (
            <KujiRevealWaitingView mode={props.mode} />
          ) : null}

          {props.phase === 'showingSingleRevealResult' && props.currentTicket && props.hasNextTicket ? (
            <KujiSingleRevealResultView
              onAdvanceToNext={props.onAdvanceToNext}
              onReturnToTickets={props.onReturnToTickets}
              progressLabel={props.progressLabel}
              ticket={props.currentTicket}
            />
          ) : null}

          {props.phase === 'showingAllRevealedSummary' ? (
            <KujiAllPrizesSummaryView
              onReturnToTickets={props.onReturnToTickets}
              tickets={props.summaryTickets}
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
