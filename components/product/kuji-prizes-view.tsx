'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { IKujiPrize } from '@/interfaces/product';
import {
  cn,
  getPrizeBadgeClasses,
  getPrizeBadgeLabel,
  getPrizeStockClasses,
  getPrizeStockLabel,
} from '@/lib/utils';
import { Tickets } from 'lucide-react';

interface IKujiPrizesViewProps {
  prizes: IKujiPrize[];
}

interface IKujiPrizeCardProps {
  onSelect: (prize: IKujiPrize) => void;
  prize: IKujiPrize;
}

interface IKujiPrizeDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  prize: IKujiPrize | null;
}

interface IPrizeImage {
  alt: string;
  id: string;
  src: string;
}

function buildPrizeImages(prize: IKujiPrize | null): IPrizeImage[] {
  if (!prize?.imageUrl) {
    return [];
  }

  return [
    {
      alt: prize.name,
      id: `${prize.id}-primary`,
      src: prize.imageUrl,
    },
  ];
}

function KujiPrizeCard(props: IKujiPrizeCardProps) {
  const badgeLabel = getPrizeBadgeLabel(props.prize.prizeCode);
  const stockLabel = getPrizeStockLabel(props.prize.remainingQuantity, props.prize.initialQuantity);
  const isSoldOut = props.prize.remainingQuantity <= 0;

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border bg-card text-left shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:-translate-y-1 hover:shadow-[0_28px_60px_-42px_hsl(var(--foreground)/0.48)]',
        isSoldOut
          ? 'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.72),rgba(255,255,255,0.96))]'
          : 'border-border/60 hover:border-primary/40',
      )}
      onClick={() => props.onSelect(props.prize)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/25">
        <StorefrontImage
          src={props.prize.imageUrl}
          alt={props.prize.name}
          label={props.prize.name}
          className="h-full w-full"
          imageClassName="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/75 via-background/20 to-transparent" />

        <div className="absolute left-4 top-4">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur-sm',
              getPrizeBadgeClasses(props.prize.prizeCode),
            )}
          >
            {badgeLabel}
          </span>
        </div>

        <div className="absolute right-4 top-4">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm',
              getPrizeStockClasses(props.prize.remainingQuantity, props.prize.initialQuantity),
            )}
          >
            {stockLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-tight text-foreground">{props.prize.name}</h3>
          {props.prize.description ? (
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{props.prize.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{props.prize.remainingQuantity}</span>
            {' '}
            of
            {' '}
            <span className="font-semibold text-foreground">{props.prize.initialQuantity}</span>
            {' '}
            remaining
          </p>
          <span className="text-sm font-semibold text-primary transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            View details
          </span>
        </div>
      </div>
    </button>
  );
}

function KujiPrizeDialog(props: IKujiPrizeDialogProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const prizeImages = buildPrizeImages(props.prize);
  const activeImage = prizeImages[activeImageIndex] ?? prizeImages[0] ?? null;

  if (!props.prize) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-5xl p-0" />
      </Dialog>
    );
  }

  const prize = props.prize;
  const badgeLabel = getPrizeBadgeLabel(prize.prizeCode);
  const stockLabel = getPrizeStockLabel(prize.remainingQuantity, prize.initialQuantity);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <div className="grid max-h-[min(88vh,960px)] overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="bg-[radial-gradient(circle_at_top,rgba(249,168,212,0.18),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,244,248,0.92))] p-4 sm:p-6 lg:p-8">
            <div className="relative overflow-hidden rounded-[1.9rem] border border-border/60 bg-muted/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <div className="absolute left-4 top-4 z-10">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur-sm',
                    getPrizeBadgeClasses(prize.prizeCode),
                  )}
                >
                  {badgeLabel}
                </span>
              </div>

              <StorefrontImage
                src={activeImage?.src ?? prize.imageUrl}
                alt={activeImage?.alt ?? prize.name}
                label={prize.name}
                className="aspect-square w-full"
                imageClassName="h-full w-full"
              />
            </div>

            {prizeImages.length > 0 ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {prizeImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`View prize image ${index + 1}`}
                    aria-pressed={activeImageIndex === index}
                    className={cn(
                      'relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border bg-background/80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-24',
                      activeImageIndex === index
                        ? 'border-primary/60 shadow-[0_16px_30px_-24px_hsl(var(--foreground)/0.45)]'
                        : 'border-border/60 hover:border-primary/30',
                    )}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <StorefrontImage
                      src={image.src}
                      alt={image.alt}
                      label={prize.name}
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col border-t border-border/50 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  getPrizeBadgeClasses(prize.prizeCode),
                )}
              >
                {badgeLabel}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                  getPrizeStockClasses(prize.remainingQuantity, prize.initialQuantity),
                )}
              >
                {stockLabel}
              </span>
            </div>

            <DialogTitle className="mt-5 text-3xl sm:text-4xl">{prize.name}</DialogTitle>
            <DialogDescription className="mt-3 max-w-2xl text-base leading-7">
              {stockLabel}
              . This tier opened with
              {' '}
              {prize.initialQuantity}
              {' '}
              prizes in the lineup.
            </DialogDescription>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prize Tier</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{badgeLabel}</p>
              </div>
              <div className="rounded-[1.35rem] border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Initial Qty</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{prize.initialQuantity}</p>
              </div>
              <div className="rounded-[1.35rem] border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Remaining</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{prize.remainingQuantity}</p>
              </div>
            </div>

            {prize.description ? (
              <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-card/70 p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Prize Details
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{prize.description}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-[linear-gradient(180deg,rgba(249,168,212,0.12),rgba(255,255,255,0.96))] p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Availability</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {prize.remainingQuantity > 0
                  ? `${prize.remainingQuantity} of ${prize.initialQuantity} prizes are still available in this tier.`
                  : 'This prize tier is currently sold out.'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KujiPrizesView(props: IKujiPrizesViewProps) {
  const [selectedPrize, setSelectedPrize] = useState<IKujiPrize | null>(null);

  if (!props.prizes || props.prizes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-8 rounded-3xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/30 text-secondary-foreground">
            <Tickets className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Prizes List</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select any prize card to preview the tier and current stock.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {props.prizes.map((prize) => (
            <KujiPrizeCard key={prize.id} prize={prize} onSelect={setSelectedPrize} />
          ))}
        </div>
      </div>

      <KujiPrizeDialog
        key={selectedPrize?.id ?? 'kuji-prize-dialog'}
        open={selectedPrize !== null}
        prize={selectedPrize}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPrize(null);
          }
        }}
      />
    </>
  );
}
