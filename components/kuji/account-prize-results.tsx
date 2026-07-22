'use client';

import { Gift, Sparkles } from 'lucide-react';
import { KujiPrizeTiles } from '@/components/kuji/kuji-prize-tiles';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { IAccountKujiResult } from '@/interfaces/account';

interface IAccountPrizeResultsProps {
  disabled: boolean;
  onReveal: (resultId: string) => void;
  pendingResultId: string | null;
  results: IAccountKujiResult[];
}

export function AccountPrizeResults({
  disabled,
  onReveal,
  pendingResultId,
  results,
}: IAccountPrizeResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((result) => {
        const revealedPrize = result.revealedAt ? result.prize : null;

        if (revealedPrize) {
          return (
            <KujiPrizeTiles
              key={result.id}
              compact
              gridClassName="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1"
              imageSizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, (max-width: 1151px) 23vw, 272px"
              items={[
                {
                  id: result.id,
                  prizeCode: revealedPrize.prizeCode,
                  prizeTier: revealedPrize.prizeTier,
                  name: revealedPrize.name,
                  description: revealedPrize.description,
                  imageUrl: revealedPrize.imageUrl,
                  stockLabel: result.voidedAt ? `${revealedPrize.prizeCode} · Voided` : `Prize ${revealedPrize.prizeCode}`,
                  stockClassName: result.voidedAt
                    ? 'border-border/70 bg-background/90 text-muted-foreground'
                    : undefined,
                  triggerId: `prize-result-${result.id}`,
                },
              ]}
            />
          );
        }

        if (result.voidedAt) {
          return (
            <article key={result.id} className="flex min-h-36 flex-col justify-center rounded-xl border border-border/70 bg-muted/20 p-4">
              <Sparkles className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">Prize unavailable</p>
              {result.voidReason ? <p className="mt-1 text-sm text-muted-foreground">{result.voidReason}</p> : null}
            </article>
          );
        }

        return (
          <article key={result.id} className="flex min-h-36 flex-col justify-center rounded-xl border border-border/70 bg-muted/20 p-4">
            <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-medium">Prize ready to reveal</p>
            <Button
              id={`reveal-prize-${result.id}`}
              type="button"
              size="sm"
              className="mt-4 w-fit"
              disabled={disabled}
              onClick={() => onReveal(result.id)}
            >
              {pendingResultId === result.id ? <Spinner className="mr-2" /> : null}
              Reveal prize
            </Button>
          </article>
        );
      })}
    </div>
  );
}
