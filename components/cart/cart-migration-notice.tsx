'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ICartMigrationNotice } from '@/interfaces/cart';

export function CartMigrationNotice(props: {
  notice: ICartMigrationNotice;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-950"
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-6">
        Some outdated standard items were removed because a variant selection is now required.
        {' '}
        <span className="font-medium">
          {props.notice.removedCount} {props.notice.removedCount === 1 ? 'item' : 'items'} removed.
        </span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-amber-950 hover:bg-amber-100"
        onClick={props.onDismiss}
        aria-label="Dismiss cart update notice"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
