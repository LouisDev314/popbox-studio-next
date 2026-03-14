'use client';

import * as React from 'react';
import { IKujiPrize } from '@/interfaces/product';
import { Ticket } from 'lucide-react';

export function KujiPrizesView({ prizes }: { prizes: IKujiPrize[] }) {
  if (!prizes || prizes.length === 0) return null;

  return (
    <div className="mt-12 bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground">
          <Ticket className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Prize Lineup</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {prizes.map((prize) => {
          const isSoldOut = prize.remainingQuantity === 0;

          return (
            <div 
              key={prize.id} 
              className={`flex items-start gap-4 p-4 rounded-2xl border ${isSoldOut ? 'bg-muted/30 border-dashed opacity-60 grayscale' : 'bg-background border-border/40'}`}
            >
              <div className="h-20 w-20 shrink-0 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center font-bold text-2xl text-muted-foreground">
                {prize.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={prize.imageUrl} alt={prize.name} className="object-cover w-full h-full" />
                ) : (
                  prize.prizeCode
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs uppercase">
                    Prize {prize.prizeCode}
                  </span>
                  <span className={`text-xs font-medium ${isSoldOut ? 'text-destructive' : 'text-green-600 font-bold'}`}>
                    {prize.remainingQuantity} / {prize.initialQuantity} left
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mt-1 line-clamp-2 leading-tight">
                  {prize.name}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
