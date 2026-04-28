'use client';

import { Tickets } from 'lucide-react';
import { KujiPrizeTiles, type IKujiPrizeTileItem } from '@/components/kuji/kuji-prize-tiles';
import { IKujiPrize } from '@/interfaces/product';
import {
  getPrizeStockClasses,
  getPrizeStockLabel,
} from '@/lib/utils';
import { isLastOnePrizeTier } from '@/lib/kuji-prize-codes';

interface IKujiPrizesViewProps {
  prizes: IKujiPrize[];
}

function toPrizeTile(prize: IKujiPrize): IKujiPrizeTileItem {
  return {
    id: prize.id,
    prizeCode: prize.prizeCode,
    prizeTier: prize.prizeTier,
    name: prize.name,
    description: prize.description,
    imageUrl: prize.imageUrl,
    stockClassName: getPrizeStockClasses(prize.remainingQuantity, prize.initialQuantity),
    stockLabel: isLastOnePrizeTier(prize.prizeTier)
      ? null
      : getPrizeStockLabel(prize.remainingQuantity, prize.initialQuantity),
  };
}

export function KujiPrizesView(props: IKujiPrizesViewProps) {
  if (!props.prizes || props.prizes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Tickets className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Prizes List</h2>
      </div>

      <KujiPrizeTiles items={props.prizes.map(toPrizeTile)} />
    </div>
  );
}
