'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, PanelRightOpen, Ticket as TicketIcon } from 'lucide-react';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { type IGuestTicketView, type IOrderTicket } from '@/interfaces/order';
import { KujiRevealOverlay } from '@/components/kuji/kuji-reveal-overlay';
import { TicketRevealCard } from '@/components/kuji/ticket-reveal-card';
import { Button } from '@/components/ui/button';
import { useStorefrontAlert } from '@/hooks/use-storefront-alert';
import { getGuestOrderPath } from '../guest-order-routing';

interface IOrderTicketsPageClientProps {
  initialViewData: IGuestTicketView;
  publicId: string;
}

type TRevealPhase =
  | 'idle'
  | 'playingSingleRevealVideo'
  | 'showingSingleRevealResult'
  | 'showingAllRevealedSummary';

function upsertTicket(tickets: IOrderTicket[], nextTicket: IOrderTicket) {
  const existingIndex = tickets.findIndex((ticket) => ticket.id === nextTicket.id);

  if (existingIndex === -1) {
    return [...tickets, nextTicket];
  }

  return tickets.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket));
}

function updateViewDataForSingleReveal(viewData: IGuestTicketView, nextTicket: IOrderTicket): IGuestTicketView {
  const unrevealed = viewData.unrevealed.filter((ticket) => ticket.id !== nextTicket.id);
  const revealed = upsertTicket(viewData.revealed, nextTicket);

  return {
    ...viewData,
    revealed,
    unrevealed,
    counts: {
      ...viewData.counts,
      total: viewData.counts.total || revealed.length + unrevealed.length,
      revealed: revealed.length,
      unrevealed: unrevealed.length,
    },
  };
}

function buildSummaryTickets(...ticketLists: IOrderTicket[][]): IOrderTicket[] {
  const seenTicketIds = new Set<string>();

  return ticketLists.flatMap((tickets) => tickets).filter((ticket) => {
    if (!ticket.prize || seenTicketIds.has(ticket.id)) {
      return false;
    }

    seenTicketIds.add(ticket.id);
    return true;
  });
}

function getNextRevealTicketId(
  revealSequenceIds: string[],
  currentTicketId: string,
  unrevealedTickets: IOrderTicket[],
): string | null {
  const currentIndex = revealSequenceIds.indexOf(currentTicketId);

  if (currentIndex === -1) {
    return null;
  }

  const unrevealedIds = new Set(unrevealedTickets.map((ticket) => ticket.id));

  for (const ticketId of revealSequenceIds.slice(currentIndex + 1)) {
    if (unrevealedIds.has(ticketId)) {
      return ticketId;
    }
  }

  return null;
}

function buildProgressLabel(revealSequenceIds: string[], currentTicketId: string): string | null {
  const currentIndex = revealSequenceIds.indexOf(currentTicketId);

  if (currentIndex === -1 || revealSequenceIds.length === 0) {
    return null;
  }

  return `Ticket ${currentIndex + 1} / ${revealSequenceIds.length}`;
}

export default function OrderTicketsPageClient(props: IOrderTicketsPageClientProps) {
  const [viewData, setViewData] = useState(props.initialViewData);
  const [phase, setPhase] = useState<TRevealPhase>('idle');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [revealSequenceIds, setRevealSequenceIds] = useState<string[]>([]);
  const [currentRevealedTicket, setCurrentRevealedTicket] = useState<IOrderTicket | null>(null);
  const [summaryTickets, setSummaryTickets] = useState<IOrderTicket[]>([]);
  const [isVideoGateComplete, setIsVideoGateComplete] = useState(false);
  const [isWaitingForSingleReveal, setIsWaitingForSingleReveal] = useState(false);
  const viewDataRef = useRef(viewData);
  const revealSequenceIdsRef = useRef(revealSequenceIds);
  const currentRevealedTicketRef = useRef<IOrderTicket | null>(currentRevealedTicket);
  const isVideoGateCompleteRef = useRef(isVideoGateComplete);
  const lastFocusTargetRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const revealAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const isRevealInFlightRef = useRef(false);
  const { showSuccess } = useStorefrontAlert();
  const orderHref = getGuestOrderPath(props.publicId);

  useEffect(() => {
    viewDataRef.current = viewData;
  }, [viewData]);

  useEffect(() => {
    revealSequenceIdsRef.current = revealSequenceIds;
  }, [revealSequenceIds]);

  useEffect(() => {
    currentRevealedTicketRef.current = currentRevealedTicket;
  }, [currentRevealedTicket]);

  useEffect(() => {
    isVideoGateCompleteRef.current = isVideoGateComplete;
  }, [isVideoGateComplete]);

  const refreshTickets = useCallback(async () => {
    try {
      const response = await QueryConfigs.fetchGuestTickets(props.publicId);

      if (response.data.data) {
        setViewData(response.data.data);
      }
    } catch {
      // Preserve the last successful local state if refresh fails.
    }
  }, [props.publicId]);

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const nextFocusTarget = lastFocusTargetRef.current && document.contains(lastFocusTargetRef.current)
          ? lastFocusTargetRef.current
          : revealAllButtonRef.current ?? headingRef.current;

        nextFocusTarget?.focus();
        lastFocusTargetRef.current = null;
      });
    });
  }, []);

  const resetRevealFlow = useCallback((shouldRestoreFocus: boolean = false) => {
    isRevealInFlightRef.current = false;
    setPhase('idle');
    setActiveTicketId(null);
    setRevealSequenceIds([]);
    setCurrentRevealedTicket(null);
    setSummaryTickets([]);
    setIsVideoGateComplete(false);
    setIsWaitingForSingleReveal(false);
    currentRevealedTicketRef.current = null;
    isVideoGateCompleteRef.current = false;

    if (shouldRestoreFocus) {
      restoreFocus();
    }
  }, [restoreFocus]);

  const advanceSingleRevealPhase = useCallback((options?: {
    nextViewData?: IGuestTicketView;
    revealedTicket?: IOrderTicket | null;
    videoGateComplete?: boolean;
  }) => {
    const revealedTicket = options?.revealedTicket ?? currentRevealedTicketRef.current;
    const nextViewData = options?.nextViewData ?? viewDataRef.current;
    const videoGateComplete = options?.videoGateComplete ?? isVideoGateCompleteRef.current;

    if (!revealedTicket || !videoGateComplete) {
      return;
    }

    const nextTicketId = getNextRevealTicketId(
      revealSequenceIdsRef.current,
      revealedTicket.id,
      nextViewData.unrevealed,
    );

    if (nextTicketId) {
      setPhase('showingSingleRevealResult');
      return;
    }

    setSummaryTickets(buildSummaryTickets(nextViewData.revealed));
    setPhase('showingAllRevealedSummary');
  }, []);

  const { mutation: revealSingle, isPending: isSingleRevealPending } = useCustomizeMutation<
    IOrderTicket,
    { publicId: string; ticketId: string }
  >({
    mutationFn: (args: { publicId: string; ticketId: string }) => MutationConfigs.revealTicket(args),
    onSuccess: (response) => {
      isRevealInFlightRef.current = false;

      const revealedTicket = response.data.data;

      if (!revealedTicket) {
        setIsWaitingForSingleReveal(false);
        showSuccess('Unable to reveal ticket', 'Please try again.', 'warning');
        resetRevealFlow(true);
        return;
      }

      const nextViewData = updateViewDataForSingleReveal(viewDataRef.current, revealedTicket);

      setViewData(nextViewData);
      setCurrentRevealedTicket(revealedTicket);
      currentRevealedTicketRef.current = revealedTicket;
      setActiveTicketId(revealedTicket.id);
      setIsWaitingForSingleReveal(false);
      advanceSingleRevealPhase({
        nextViewData,
        revealedTicket,
      });
      void refreshTickets();
    },
    onError: () => {
      isRevealInFlightRef.current = false;
      setIsWaitingForSingleReveal(false);
      showSuccess('Unable to reveal ticket', 'Please try again.', 'warning');
      resetRevealFlow(true);
    },
  });

  const { mutation: revealAll, isPending: isRevealAllPending } = useCustomizeMutation<
    IGuestTicketView,
    string
  >({
    mutationFn: (id: string) => MutationConfigs.revealAllTickets(id),
    onSuccess: (response) => {
      isRevealInFlightRef.current = false;

      const nextViewData = response.data.data ?? viewDataRef.current;

      setViewData(nextViewData);
      setCurrentRevealedTicket(null);
      setActiveTicketId(null);
      setRevealSequenceIds([]);
      setIsVideoGateComplete(false);
      setIsWaitingForSingleReveal(false);
      setSummaryTickets(buildSummaryTickets(nextViewData.revealed, viewDataRef.current.revealed));
      setPhase('showingAllRevealedSummary');
      void refreshTickets();
    },
    onError: () => {
      isRevealInFlightRef.current = false;
      showSuccess('Unable to reveal all tickets', 'Please try again.', 'warning');
      restoreFocus();
    },
  });

  const runSingleRevealFlow = useCallback((ticketId: string, options?: {
    focusTarget?: HTMLElement | null;
    sequenceIds?: string[];
  }) => {
    if (isRevealInFlightRef.current) {
      return;
    }

    isRevealInFlightRef.current = true;

    if (options?.focusTarget) {
      lastFocusTargetRef.current = options.focusTarget;
    } else if (!lastFocusTargetRef.current && document.activeElement instanceof HTMLElement) {
      lastFocusTargetRef.current = document.activeElement;
    }

    const nextSequenceIds = options?.sequenceIds ?? revealSequenceIdsRef.current;

    setRevealSequenceIds(nextSequenceIds);
    revealSequenceIdsRef.current = nextSequenceIds;
    setActiveTicketId(ticketId);
    setCurrentRevealedTicket(null);
    currentRevealedTicketRef.current = null;
    setSummaryTickets([]);
    setIsVideoGateComplete(false);
    isVideoGateCompleteRef.current = false;
    setIsWaitingForSingleReveal(true);
    setPhase('playingSingleRevealVideo');

    revealSingle({ publicId: props.publicId, ticketId });
  }, [props.publicId, revealSingle]);


  const isInteractionLocked = phase !== 'idle' || isSingleRevealPending || isRevealAllPending;

  const handleReveal = useCallback((ticketId: string, focusTarget?: HTMLElement | null) => {
    if (isInteractionLocked || isRevealInFlightRef.current) {
      return;
    }

    runSingleRevealFlow(ticketId, {
      focusTarget,
      sequenceIds: viewData.unrevealed.map((ticket) => ticket.id),
    });
  }, [isInteractionLocked, runSingleRevealFlow, viewData.unrevealed]);

  const handleRevealAll = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (isInteractionLocked || isRevealInFlightRef.current) {
      return;
    }

    isRevealInFlightRef.current = true;
    lastFocusTargetRef.current = event.currentTarget;
    setSummaryTickets([]);
    revealAll(props.publicId);
  }, [isInteractionLocked, props.publicId, revealAll]);

  const handleAdvanceToNext = useCallback(() => {
    if (!currentRevealedTicket) {
      return;
    }

    const nextTicketId = getNextRevealTicketId(
      revealSequenceIdsRef.current,
      currentRevealedTicket.id,
      viewDataRef.current.unrevealed,
    );

    if (!nextTicketId) {
      setSummaryTickets(buildSummaryTickets(viewDataRef.current.revealed));
      setPhase('showingAllRevealedSummary');
      return;
    }

    runSingleRevealFlow(nextTicketId, {
      sequenceIds: revealSequenceIdsRef.current,
    });
  }, [currentRevealedTicket, runSingleRevealFlow]);

  const handleVideoComplete = useCallback(() => {
    isVideoGateCompleteRef.current = true;
    setIsVideoGateComplete(true);
    advanceSingleRevealPhase({
      videoGateComplete: true,
    });
  }, [advanceSingleRevealPhase]);

  const handleReturnToTickets = useCallback(() => {
    resetRevealFlow(true);
  }, [resetRevealFlow]);

  const currentNextTicketId = currentRevealedTicket
    ? getNextRevealTicketId(revealSequenceIds, currentRevealedTicket.id, viewData.unrevealed)
    : null;
  const progressLabel = currentRevealedTicket
    ? buildProgressLabel(revealSequenceIds, currentRevealedTicket.id)
    : null;

  const { unrevealed, revealed, counts } = viewData;
  const renderedSummaryTickets = summaryTickets.length > 0 ? summaryTickets : buildSummaryTickets(revealed);
  const allRevealed = unrevealed.length === 0;

  return (
    <>
      <KujiRevealOverlay
        currentTicket={currentRevealedTicket}
        hasNextTicket={currentNextTicketId !== null}
        isOpen={phase !== 'idle'}
        isWaitingForSingleReveal={phase === 'playingSingleRevealVideo' && isWaitingForSingleReveal}
        onAdvanceToNext={handleAdvanceToNext}
        onReturnToTickets={handleReturnToTickets}
        onVideoComplete={handleVideoComplete}
        phase={phase === 'idle' ? 'showingAllRevealedSummary' : phase}
        progressLabel={progressLabel}
        summaryTickets={renderedSummaryTickets}
      />

      <div className="container mx-auto min-h-[70vh] max-w-6xl px-4 py-8 lg:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={orderHref}
            className="hover:text-foreground text-sm font-medium text-muted-foreground inline-flex items-center transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Order
          </Link>

          <div className="flex rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-semibold tracking-wide">
            <span className="text-primary">{counts.revealed}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-foreground">{counts.total} Revealed</span>
          </div>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="flex items-center gap-4 text-4xl font-semibold tracking-tight text-foreground outline-none lg:text-5xl"
            >
              <TicketIcon className="h-10 w-10 text-primary lg:h-12 lg:w-12" />
              Your Tickets
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {allRevealed
                ? 'All your prizes have been revealed! They will be shipped to you soon.'
                : null}
            </p>
          </div>

          {allRevealed ? null : (
            <Button
              ref={revealAllButtonRef}
              size="lg"
              onClick={handleRevealAll}
              disabled={isInteractionLocked}
              className="h-14 rounded-xl px-8 text-lg font-bold transition-all active:scale-95"
            >
              {isRevealAllPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Revealing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PanelRightOpen className="h-5 w-5" />
                  Reveal All
                </span>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-16">
          {unrevealed.length > 0 ? (
            <section>
              <h2 className="mb-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
                </span>
                <p className="text-xl">Awaiting Reveal ({unrevealed.length})</p>
              </h2>
              {unrevealed.length ? <p className="mb-8">Click on the tickets below to reveal them.</p> : null}
              <div className="grid grid-cols-1 justify-items-center gap-4 sm:gap-5 xl:grid-cols-2 xl:gap-6">
                {unrevealed.map((ticket: IOrderTicket) => (
                  <div key={ticket.id} className="w-full max-w-152">
                    <TicketRevealCard
                      ticket={ticket}
                      onReveal={handleReveal}
                      isRevealing={isRevealAllPending || (activeTicketId === ticket.id && phase === 'playingSingleRevealVideo')}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {revealed.length > 0 ? (
            <section>
              <h2 className="mb-8 text-xl font-semibold tracking-tight text-foreground/80">
                Revealed Prizes ({revealed.length})
              </h2>
              <div className="grid grid-cols-1 justify-items-center gap-4 sm:gap-5 xl:grid-cols-2 xl:gap-6">
                {revealed.map((ticket: IOrderTicket) => (
                  <div key={ticket.id} className="w-full max-w-[38rem]">
                    <TicketRevealCard
                      ticket={ticket}
                      onReveal={() => {}}
                      isRevealing={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
