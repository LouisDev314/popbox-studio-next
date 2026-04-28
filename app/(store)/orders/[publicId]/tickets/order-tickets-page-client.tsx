'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PackageOpen, Ticket as TicketIcon } from 'lucide-react';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { type IGuestTicketView, type IOrderTicket } from '@/interfaces/order';
import {
  KujiRevealOverlay,
  type TKujiRevealOverlayMode,
  type TKujiRevealOverlayPhase,
} from '@/components/kuji/kuji-reveal-overlay';
import { KujiPrizeTiles, type IKujiPrizeTileItem } from '@/components/kuji/kuji-prize-tiles';
import { TicketRevealCard } from '@/components/kuji/ticket-reveal-card';
import { Button } from '@/components/ui/button';
import { useStorefrontAlert } from '@/hooks/use-storefront-alert';
import { getGuestOrderPath } from '../guest-order-routing';

interface IOrderTicketsPageClientProps {
  initialViewData: IGuestTicketView;
  publicId: string;
}

interface IGroupedTicketsSection {
  productId: string;
  productName: string;
  revealed: IOrderTicket[];
  unrevealed: IOrderTicket[];
}

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
    tickets: upsertTicket(viewData.tickets, nextTicket),
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

function buildRevealedPrizeTiles(tickets: IOrderTicket[]): IKujiPrizeTileItem[] {
  return tickets.flatMap((ticket) => {
    if (!ticket.prize) {
      return [];
    }

    return [{
      description: ticket.prize.description,
      id: ticket.id,
      imageUrl: ticket.prize.imageUrl,
      name: ticket.prize.name,
      prizeCode: ticket.prize.prizeCode,
      prizeTier: ticket.prize.prizeTier,
    }];
  });
}

function buildGroupedTicketSections(viewData: IGuestTicketView): IGroupedTicketsSection[] {
  const sections = new Map<string, IGroupedTicketsSection>();
  const ensureSection = (ticket: IOrderTicket) => {
    const existingSection = sections.get(ticket.kujiProduct.id);

    if (existingSection) {
      return existingSection;
    }

    const nextSection = {
      productId: ticket.kujiProduct.id,
      productName: ticket.kujiProduct.name,
      revealed: [],
      unrevealed: [],
    };

    sections.set(ticket.kujiProduct.id, nextSection);
    return nextSection;
  };

  for (const ticket of viewData.tickets) {
    ensureSection(ticket);
  }

  for (const ticket of viewData.unrevealed) {
    ensureSection(ticket).unrevealed.push(ticket);
  }

  for (const ticket of viewData.revealed) {
    ensureSection(ticket).revealed.push(ticket);
  }

  return [...sections.values()].filter((section) => section.unrevealed.length > 0 || section.revealed.length > 0);
}

function buildSectionSupportLabel(section: IGroupedTicketsSection): string {
  const parts = [];

  if (section.unrevealed.length > 0) {
    parts.push(`${section.unrevealed.length} awaiting reveal`);
  }

  if (section.revealed.length > 0) {
    parts.push(`${section.revealed.length} revealed`);
  }

  return parts.join(' • ');
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

function getNextRevealTicketIdOrFirstRemaining(
  revealSequenceIds: string[],
  currentTicketId: string,
  unrevealedTickets: IOrderTicket[],
): string | null {
  return getNextRevealTicketId(revealSequenceIds, currentTicketId, unrevealedTickets)
    ?? unrevealedTickets[0]?.id
    ?? null;
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
  const [phase, setPhase] = useState<TKujiRevealOverlayPhase | 'idle'>('idle');
  const [revealMode, setRevealMode] = useState<TKujiRevealOverlayMode | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [revealSequenceIds, setRevealSequenceIds] = useState<string[]>([]);
  const [currentRevealedTicket, setCurrentRevealedTicket] = useState<IOrderTicket | null>(null);
  const [summaryTickets, setSummaryTickets] = useState<IOrderTicket[]>([]);
  const [isVideoGateComplete, setIsVideoGateComplete] = useState(false);
  const [isRevealResultPending, setIsRevealResultPending] = useState(false);
  const viewDataRef = useRef(viewData);
  const revealSequenceIdsRef = useRef(revealSequenceIds);
  const currentRevealedTicketRef = useRef<IOrderTicket | null>(currentRevealedTicket);
  const revealModeRef = useRef<TKujiRevealOverlayMode | null>(revealMode);
  const isVideoGateCompleteRef = useRef(isVideoGateComplete);
  const isRevealResultPendingRef = useRef(isRevealResultPending);
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
    revealModeRef.current = revealMode;
  }, [revealMode]);

  useEffect(() => {
    isVideoGateCompleteRef.current = isVideoGateComplete;
  }, [isVideoGateComplete]);

  useEffect(() => {
    isRevealResultPendingRef.current = isRevealResultPending;
  }, [isRevealResultPending]);

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
    setRevealMode(null);
    setActiveTicketId(null);
    setRevealSequenceIds([]);
    setCurrentRevealedTicket(null);
    setSummaryTickets([]);
    setIsVideoGateComplete(false);
    setIsRevealResultPending(false);
    currentRevealedTicketRef.current = null;
    revealModeRef.current = null;
    isVideoGateCompleteRef.current = false;
    isRevealResultPendingRef.current = false;

    if (shouldRestoreFocus) {
      restoreFocus();
    }
  }, [restoreFocus]);

  const advanceRevealPhase = useCallback((options?: {
    nextViewData?: IGuestTicketView;
    revealedTicket?: IOrderTicket | null;
    revealMode?: TKujiRevealOverlayMode | null;
    revealResultPending?: boolean;
    videoGateComplete?: boolean;
  }) => {
    const nextViewData = options?.nextViewData ?? viewDataRef.current;
    const revealedTicket = options?.revealedTicket ?? currentRevealedTicketRef.current;
    const nextRevealMode = options?.revealMode ?? revealModeRef.current;
    const revealResultPending = options?.revealResultPending ?? isRevealResultPendingRef.current;
    const videoGateComplete = options?.videoGateComplete ?? isVideoGateCompleteRef.current;

    if (!videoGateComplete) {
      return;
    }

    if (revealResultPending) {
      setPhase('waitingForRevealResult');
      return;
    }

    if (nextRevealMode === 'all') {
      setSummaryTickets(buildSummaryTickets(nextViewData.revealed));
      setPhase('showingAllRevealedSummary');
      return;
    }

    if (!revealedTicket) {
      return;
    }

    if (nextViewData.unrevealed.length > 0) {
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
        setIsRevealResultPending(false);
        showSuccess('Unable to reveal ticket', 'Please try again.', 'warning');
        resetRevealFlow(true);
        return;
      }

      const nextViewData = updateViewDataForSingleReveal(viewDataRef.current, revealedTicket);

      setViewData(nextViewData);
      setCurrentRevealedTicket(revealedTicket);
      currentRevealedTicketRef.current = revealedTicket;
      setActiveTicketId(revealedTicket.id);
      setIsRevealResultPending(false);
      isRevealResultPendingRef.current = false;
      advanceRevealPhase({
        nextViewData,
        revealMode: 'single',
        revealResultPending: false,
        revealedTicket,
      });
      void refreshTickets();
    },
    onError: () => {
      isRevealInFlightRef.current = false;
      setIsRevealResultPending(false);
      isRevealResultPendingRef.current = false;
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
      setSummaryTickets(buildSummaryTickets(nextViewData.revealed, viewDataRef.current.revealed));
      setIsRevealResultPending(false);
      isRevealResultPendingRef.current = false;
      advanceRevealPhase({
        nextViewData,
        revealMode: 'all',
        revealResultPending: false,
      });
      void refreshTickets();
    },
    onError: () => {
      isRevealInFlightRef.current = false;
      setIsRevealResultPending(false);
      isRevealResultPendingRef.current = false;
      showSuccess('Unable to reveal all tickets', 'Please try again.', 'warning');
      resetRevealFlow(true);
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

    setRevealMode('single');
    revealModeRef.current = 'single';
    setRevealSequenceIds(nextSequenceIds);
    revealSequenceIdsRef.current = nextSequenceIds;
    setActiveTicketId(ticketId);
    setCurrentRevealedTicket(null);
    currentRevealedTicketRef.current = null;
    setSummaryTickets([]);
    setIsVideoGateComplete(false);
    isVideoGateCompleteRef.current = false;
    setIsRevealResultPending(true);
    isRevealResultPendingRef.current = true;
    setPhase('playingRevealVideo');

    revealSingle({ publicId: props.publicId, ticketId });
  }, [props.publicId, revealSingle]);

  const runRevealAllFlow = useCallback((focusTarget?: HTMLElement | null) => {
    if (isRevealInFlightRef.current) {
      return;
    }

    isRevealInFlightRef.current = true;

    if (focusTarget) {
      lastFocusTargetRef.current = focusTarget;
    } else if (!lastFocusTargetRef.current && document.activeElement instanceof HTMLElement) {
      lastFocusTargetRef.current = document.activeElement;
    }

    setRevealMode('all');
    revealModeRef.current = 'all';
    setActiveTicketId(null);
    setCurrentRevealedTicket(null);
    currentRevealedTicketRef.current = null;
    setRevealSequenceIds([]);
    revealSequenceIdsRef.current = [];
    setSummaryTickets([]);
    setIsVideoGateComplete(false);
    isVideoGateCompleteRef.current = false;
    setIsRevealResultPending(true);
    isRevealResultPendingRef.current = true;
    setPhase('playingRevealVideo');

    revealAll(props.publicId);
  }, [props.publicId, revealAll]);

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

    runRevealAllFlow(event.currentTarget);
  }, [isInteractionLocked, runRevealAllFlow]);

  const handleAdvanceToNext = useCallback(() => {
    if (!currentRevealedTicket) {
      return;
    }

    const nextTicketId = getNextRevealTicketIdOrFirstRemaining(
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
    if (isVideoGateCompleteRef.current) {
      return;
    }

    isVideoGateCompleteRef.current = true;
    setIsVideoGateComplete(true);
    advanceRevealPhase({
      videoGateComplete: true,
    });
  }, [advanceRevealPhase]);

  const handleReturnToTickets = useCallback(() => {
    resetRevealFlow(true);
  }, [resetRevealFlow]);

  const currentNextTicketId = currentRevealedTicket
    ? getNextRevealTicketIdOrFirstRemaining(revealSequenceIds, currentRevealedTicket.id, viewData.unrevealed)
    : null;
  const progressLabel = currentRevealedTicket
    ? buildProgressLabel(revealSequenceIds, currentRevealedTicket.id)
    : null;

  const { unrevealed, revealed, counts } = viewData;
  const groupedSections = buildGroupedTicketSections(viewData);
  const renderedSummaryTickets = summaryTickets.length > 0 ? summaryTickets : buildSummaryTickets(revealed);
  const allRevealed = unrevealed.length === 0;

  return (
    <>
      <KujiRevealOverlay
        currentTicket={currentRevealedTicket}
        hasNextTicket={currentNextTicketId !== null}
        isOpen={phase !== 'idle'}
        mode={revealMode}
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
              className="h-14 w-fit rounded-xl px-6 text-lg font-bold transition-all active:scale-95"
            >
              <span className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5" />
                <p className='text-lg'>Reveal All</p>
              </span>
            </Button>
          )}
        </div>

        <div className="space-y-14">
          {groupedSections.map((section) => {
            const revealedPrizeTiles = buildRevealedPrizeTiles(section.revealed);
            const hasMixedContent = section.unrevealed.length > 0 && revealedPrizeTiles.length > 0;

            return (
              <section
                key={section.productId}
                aria-labelledby={`ticket-group-heading-${section.productId}`}
                data-testid={`ticket-group-${section.productId}`}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2
                    id={`ticket-group-heading-${section.productId}`}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
                  >
                    {section.productName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {buildSectionSupportLabel(section)}
                  </p>
                </div>

                {section.unrevealed.length > 0 ? (
                  <div className="grid grid-cols-1 justify-items-center gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                    {section.unrevealed.map((ticket) => (
                      <div key={ticket.id} className="w-full max-w-152">
                        <TicketRevealCard
                          ticket={ticket}
                          onReveal={handleReveal}
                          isRevealing={activeTicketId === ticket.id && phase === 'playingRevealVideo'}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {revealedPrizeTiles.length > 0 ? (
                  <div className={hasMixedContent ? 'space-y-6' : 'space-y-0'}>
                    {hasMixedContent ? <div className="border-t border-border/60" aria-hidden="true" /> : null}
                    <KujiPrizeTiles compact items={revealedPrizeTiles} />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
