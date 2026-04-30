'use client';

import { type ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { StorefrontImage } from '@/components/ui/storefront-image';
import {
  cn,
  getPrizeBadgeClasses,
  getPrizeBadgeLabel,
} from '@/lib/utils';

export interface IKujiPrizeTileItem {
  id: string;
  prizeCode: string;
  prizeTier: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  kujiProductName?: string | null;
  stockClassName?: string;
  stockLabel?: string | null;
}

interface IKujiPrizeTilesProps {
  items: IKujiPrizeTileItem[];
  compact?: boolean;
  dialogModal?: boolean;
  enableDialog?: boolean;
  emptyState?: ReactNode;
  gridClassName?: string;
}

interface IKujiPrizeTileCardProps {
  compact: boolean;
  interactive: boolean;
  item: IKujiPrizeTileItem;
  onSelect: () => void;
}

function KujiPrizeImage(props: {
  alt: string;
  className?: string;
  compact?: boolean;
  label: string;
  src: string | null;
}) {
  const [loadedImageRatio, setLoadedImageRatio] = useState<{
    ratio: number;
    src: string | null;
  } | null>(null);
  const imageAspectRatio = loadedImageRatio?.src === props.src ? loadedImageRatio.ratio : null;

  return (
    <div
      data-testid="kuji-prize-image-frame"
      style={imageAspectRatio ? { aspectRatio: imageAspectRatio } : undefined}
      className={cn(
        'relative mx-auto w-full',
        props.compact ? 'aspect-square' : 'aspect-[4/3]',
        props.className,
      )}
    >
      <StorefrontImage
        src={props.src}
        alt={props.alt}
        label={props.label}
        sizes={props.compact ? '(max-width: 640px) 50vw, 12rem' : '(max-width: 1024px) 50vw, 24rem'}
        className="h-full w-full"
        imageClassName="object-contain"
        fallbackClassName={props.compact ? 'px-3 py-1.5 text-[10px]' : undefined}
        onImageLoad={(image) => {
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            const ratio = image.naturalWidth / image.naturalHeight;

            setLoadedImageRatio((currentRatio) => {
              if (currentRatio?.src === props.src && currentRatio.ratio === ratio) {
                return currentRatio;
              }

              return {
                ratio,
                src: props.src,
              };
            });
          }
        }}
      />
    </div>
  );
}

function KujiPrizeTileCard(props: IKujiPrizeTileCardProps) {
  const content = (
    <>
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-muted/25">
        <KujiPrizeImage
          src={props.item.imageUrl}
          alt={props.item.name}
          label={props.item.name}
          compact={props.compact}
          className={cn(
            'transition-transform duration-500 ease-out',
            props.interactive && 'group-hover:scale-[1.02]',
          )}
        />

        {props.item.stockLabel ? (
          <div className="absolute right-3 top-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                props.item.stockClassName ?? 'border-border/70 bg-background text-muted-foreground',
              )}
            >
              {props.item.stockLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className={cn(
        'flex flex-1 flex-col text-center',
        props.compact ? 'gap-1 p-2.5 sm:p-3' : 'gap-2.5 p-4 sm:p-5',
      )}
      >
        <h3 className={cn(
          'font-semibold text-foreground',
          props.compact ? 'line-clamp-2 text-sm leading-5' : 'text-lg leading-tight',
        )}
        >
          {props.item.name}
        </h3>

        {props.item.kujiProductName ? (
          <p className={cn(
            'text-muted-foreground',
            props.compact ? 'line-clamp-2 text-xs leading-4' : 'text-sm leading-6',
          )}
          >
            {props.item.kujiProductName}
          </p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    'group flex h-full w-full flex-col overflow-hidden border border-border/60 bg-card text-left shadow-sm transition-all duration-300 ease-out',
    props.compact
      ? 'rounded-[1.15rem]'
      : 'rounded-2xl',
    props.interactive
      ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-primary/35 hover:shadow-md'
      : 'border-border/60',
  );

  if (!props.interactive) {
    return (
      <article className={className}>
        {content}
      </article>
    );
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={className}
      onClick={props.onSelect}
    >
      {content}
    </button>
  );
}

function KujiPrizeDialog(props: {
  item: IKujiPrizeTileItem | null;
  modal?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!props.item) {
    return (
      <Dialog modal={props.modal} open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent aria-describedby={undefined} className="max-w-5xl p-0" />
      </Dialog>
    );
  }

  const badgeLabel = getPrizeBadgeLabel(props.item.prizeTier);

  return (
    <Dialog modal={props.modal} open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        key={props.item.id}
        className="max-w-5xl p-0"
      >
        <div className="grid max-h-[min(88vh,960px)] overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="bg-background p-4 sm:p-6 lg:p-8">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/25">
              <KujiPrizeImage
                src={props.item.imageUrl}
                alt={props.item.name}
                label={props.item.name}
                className="max-h-[min(72vh,44rem)]"
              />
            </div>
          </div>

          <div className="flex flex-col border-t border-border/50 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  getPrizeBadgeClasses(props.item.prizeTier),
                )}
              >
                {badgeLabel}
              </span>

              {props.item.stockLabel ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                    props.item.stockClassName ?? 'border-border/70 bg-background text-muted-foreground',
                  )}
                >
                  {props.item.stockLabel}
                </span>
              ) : null}
            </div>

            <DialogTitle className="mt-5 text-3xl sm:text-4xl">{props.item.name}</DialogTitle>

            <DialogDescription className={cn(
              'mt-4 max-w-2xl text-base leading-7',
              !props.item.description && 'sr-only',
            )}
            >
              {props.item.description ?? 'Prize details preview.'}
            </DialogDescription>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KujiPrizeTiles(props: IKujiPrizeTilesProps) {
  const [selectedPrize, setSelectedPrize] = useState<IKujiPrizeTileItem | null>(null);
  const interactive = props.enableDialog ?? true;

  if (!props.items.length) {
    return props.emptyState ?? null;
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-4',
          props.compact
            ? 'grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          props.gridClassName,
        )}
      >
        {props.items.map((item) => (
          <KujiPrizeTileCard
            key={item.id}
            compact={props.compact ?? false}
            interactive={interactive}
            item={item}
            onSelect={() => setSelectedPrize(item)}
          />
        ))}
      </div>

      {interactive ? (
        <KujiPrizeDialog
          modal={props.dialogModal}
          open={selectedPrize !== null}
          item={selectedPrize}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPrize(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
