'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { cn } from '@/lib/utils';
import type { IOrderTicket } from '@/interfaces/order';

export type TKujiRevealOverlayPhase =
  | 'playingSingleRevealVideo'
  | 'showingSingleRevealResult'
  | 'showingAllRevealedSummary';

interface IKujiRevealOverlayProps {
  currentTicket: IOrderTicket | null;
  hasNextTicket: boolean;
  isOpen: boolean;
  isWaitingForSingleReveal: boolean;
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
        'relative flex min-h-dvh w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#faf8f3_0%,#f6f3ec_48%,#f3efe6_100%)] text-foreground',
        'before:absolute before:-left-24 before:top-12 before:h-64 before:w-64 before:rounded-full before:bg-primary/10 before:blur-3xl before:content-[\'\']',
        'after:absolute after:-right-20 after:bottom-12 after:h-72 after:w-72 after:rounded-full after:bg-sky-200/30 after:blur-3xl after:content-[\'\']',
        props.className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_56%)]" />
      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
        {props.children}
      </div>
    </div>
  );
}

function KujiRevealVideoView(props: {
  isWaitingForSingleReveal: boolean;
  onVideoComplete: () => void;
}) {
  return (
    <OverlayAtmosphere className="bg-[#111827] text-white before:bg-sky-500/18 after:bg-cyan-400/14">
      <div className="relative flex min-h-dvh flex-1 items-center justify-center">
        {props.isWaitingForSingleReveal ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/18 bg-white/10 backdrop-blur-sm">
              <Loader2 className="h-7 w-7 animate-spin text-white/90" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold tracking-tight text-white">Revealing your prize</p>
              <p className="text-sm text-white/72 sm:text-base">
                Finalizing the result. This should only take a moment.
              </p>
            </div>
          </div>
        ) : (
          <>
            <video
              autoPlay
              controls={false}
              muted
              onEnded={props.onVideoComplete}
              onError={props.onVideoComplete}
              playsInline
              preload="auto"
              src="/kuji-reveal-mobile.mp4"
              className="absolute inset-0 h-full w-full object-cover"
              data-testid="kuji-reveal-mobile-video"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0.24)_100%)]" />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            />
          </>
        )}
      </div>

      {props.isWaitingForSingleReveal ? null : (
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
      )}
    </OverlayAtmosphere>
  );
}

function KujiSingleRevealResultView(props: {
  onAdvanceToNext: () => void;
  progressLabel: string | null;
  ticket: IOrderTicket;
}) {
  const prizeName = props.ticket.prize?.name ?? 'Prize revealed';
  const prizeCode = props.ticket.prize?.prizeCode ?? '—';

  return (
    <OverlayAtmosphere>
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-between px-5 pb-8 pt-12 sm:px-8 sm:pb-10 sm:pt-14">
        <div className="w-full max-w-sm space-y-4 text-center sm:max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Congratulations
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {prizeName}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/78 shadow-sm">
              Prize {prizeCode}
            </span>
            {props.progressLabel ? (
              <span className="inline-flex rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                {props.progressLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-border/70 bg-background/70 p-4 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm">
            <StorefrontImage
              src={props.ticket.prize?.imageUrl}
              alt={prizeName}
              label={prizeName}
              className="h-full w-full overflow-hidden rounded-[1.5rem]"
              imageClassName="h-full w-full"
              priority
            />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4 text-center sm:max-w-md">
          <Button
            type="button"
            onClick={props.onAdvanceToNext}
            className="h-13 w-full rounded-full px-6 text-base font-semibold shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)]"
          >
            Click to reveal the next ticket
          </Button>
          <p className="text-sm text-muted-foreground">
            Your remaining tickets stay in sequence.
          </p>
        </div>
      </div>
    </OverlayAtmosphere>
  );
}

function KujiAllPrizesSummaryView(props: {
  onReturnToTickets: () => void;
  tickets: IOrderTicket[];
}) {
  return (
    <OverlayAtmosphere>
      <div className="flex min-h-dvh flex-1 flex-col px-5 pb-8 pt-12 sm:px-8 sm:pb-10 sm:pt-14">
        <div className="mx-auto w-full max-w-5xl flex-1">
          <div className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Congratulations
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              All prizes revealed
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your full ticket result is ready. Review the revealed prizes, then return to the tickets page.
            </p>
          </div>

          <div className="mt-8 rounded-[2rem] border border-border/70 bg-background/78 p-4 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:p-6">
            {props.tickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {props.tickets.map((ticket) => {
                  const prizeName = ticket.prize?.name ?? 'Prize revealed';
                  const prizeCode = ticket.prize?.prizeCode ?? '—';

                  return (
                    <article
                      key={ticket.id}
                      className="overflow-hidden rounded-[1.5rem] border border-border/65 bg-card/90"
                    >
                      <div className="aspect-[1.05/1] overflow-hidden bg-muted/30">
                        <StorefrontImage
                          src={ticket.prize?.imageUrl}
                          alt={prizeName}
                          label={prizeName}
                          className="h-full w-full"
                          imageClassName="h-full w-full"
                        />
                      </div>
                      <div className="space-y-3 p-4">
                        <span className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/75">
                          Prize {prizeCode}
                        </span>
                        <h3 className="text-lg font-semibold leading-tight text-foreground">
                          {prizeName}
                        </h3>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground sm:text-base">
                Your ticket summary is syncing. You can return now, and the updated prize list will remain on the tickets page.
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-sm">
          <Button
            type="button"
            onClick={props.onReturnToTickets}
            className="h-13 w-full rounded-full px-6 text-base font-semibold shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)]"
          >
            Return to tickets
          </Button>
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

          {props.phase === 'playingSingleRevealVideo' ? (
            <KujiRevealVideoView
              isWaitingForSingleReveal={props.isWaitingForSingleReveal}
              onVideoComplete={props.onVideoComplete}
            />
          ) : null}

          {props.phase === 'showingSingleRevealResult' && props.currentTicket && props.hasNextTicket ? (
            <KujiSingleRevealResultView
              onAdvanceToNext={props.onAdvanceToNext}
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
